import {
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  CreateManualPaymentDTO,
  PaymentDTO,
} from "./payments.dto.js";
import type { CreateManualPaymentInput } from "./payments.inputs.js";
import * as repo from "./payments.repository.js";

const mapPayment = (payment: repo.PaymentRecord): PaymentDTO => ({
  id: payment.id,
  bookingId: payment.bookingId,
  propertyId: payment.propertyId,
  userId: payment.userId,
  provider: payment.provider,
  status: payment.status,
  purpose: payment.purpose,
  method: payment.method,
  amount: Number(payment.amount),
  currency: payment.currency,
  idempotencyKey: payment.idempotencyKey,
  providerOrderId: payment.providerOrderId ?? null,
  providerPaymentId: payment.providerPaymentId ?? null,
  note: payment.note ?? null,
  receivedByUserId: payment.receivedByUserId ?? null,
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
});

const zeroDecimal = new Prisma.Decimal(0);

const maxDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.greaterThan(right) ? left : right;

const minDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.lessThan(right) ? left : right;

const mapManualPaymentResult = (
  payment: repo.PaymentRecord,
  paidAmount: Prisma.Decimal,
  balanceAmount: Prisma.Decimal,
): CreateManualPaymentDTO => ({
  payment: mapPayment(payment),
  booking: {
    id: payment.bookingId,
    status: payment.booking.status,
    totalAmount: Number(payment.booking.totalAmount),
    paymentStatus: payment.booking.paymentStatus,
    paidAmount: Number(paidAmount),
    balanceAmount: Number(balanceAmount),
  },
});

export const resolveBookingPaymentStatus = (
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
): BookingPaymentStatus => {
  if (paidAmount.lessThanOrEqualTo(0)) {
    return BookingPaymentStatus.PENDING;
  }

  if (paidAmount.lessThan(totalAmount)) {
    return BookingPaymentStatus.PARTIALLY_PAID;
  }

  return BookingPaymentStatus.PAID;
};

const assertSameIdempotentPayment = (
  payment: repo.PaymentRecord,
  input: CreateManualPaymentInput,
) => {
  const inputPurpose = input.purpose ?? PaymentPurpose.TOKEN;
  const inputMethod = input.method ?? PaymentMethod.MANUAL;

  if (
    payment.bookingId !== input.bookingId ||
    (input.userId !== undefined && payment.userId !== input.userId) ||
    payment.provider !== PaymentProvider.MANUAL ||
    payment.purpose !== inputPurpose ||
    payment.method !== inputMethod ||
    (input.amount !== undefined &&
      !payment.amount.equals(new Prisma.Decimal(input.amount)))
  ) {
    throw new HttpError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "Idempotency key was already used for another payment",
    );
  }
};

export const createManualPayment = async (
  input: CreateManualPaymentInput,
): Promise<CreateManualPaymentDTO> =>
  repo.runPaymentTransaction(async (tx) => {
    const purpose = input.purpose ?? PaymentPurpose.TOKEN;
    const method = input.method ?? PaymentMethod.MANUAL;
    const existingPayment = await repo.findPaymentByIdempotencyKey(
      input.idempotencyKey,
      tx,
    );

    if (existingPayment) {
      assertSameIdempotentPayment(existingPayment, input);
      const paidAmount = await repo.sumSucceededPaymentsByBooking(
        existingPayment.bookingId,
        tx,
      );
      const balanceAmount = maxDecimal(
        zeroDecimal,
        existingPayment.booking.totalAmount.minus(paidAmount),
      );
      return mapManualPaymentResult(existingPayment, paidAmount, balanceAmount);
    }

    const booking = await repo.findBookingForPayment(
      input.bookingId,
      input.userId,
      tx,
    );

    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new HttpError(
        409,
        "BOOKING_CANCELLED",
        "Cancelled bookings cannot be paid",
      );
    }

    if (booking.status === BookingStatus.NO_SHOW) {
      throw new HttpError(
        409,
        "BOOKING_NO_SHOW",
        "No-show bookings cannot accept new payments",
      );
    }

    if (booking.status === BookingStatus.CHECKED_OUT) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_CLOSED",
        "This booking can no longer accept payments",
      );
    }

    const paidBefore = await repo.sumSucceededPaymentsByBooking(
      booking.id,
      tx,
    );
    const balanceBefore = booking.totalAmount.minus(paidBefore);

    if (balanceBefore.lessThanOrEqualTo(0)) {
      throw new HttpError(
        409,
        "BOOKING_ALREADY_PAID",
        "Booking is already fully paid",
      );
    }

    if (purpose === PaymentPurpose.TOKEN) {
      const tokenPayment = await repo.findSucceededPaymentByBookingPurpose(
        booking.id,
        PaymentPurpose.TOKEN,
        tx,
      );

      if (tokenPayment) {
        throw new HttpError(
          409,
          "BOOKING_TOKEN_ALREADY_PAID",
          "Booking already has a successful token payment",
        );
      }
    }

    const fallbackAmount =
      purpose === PaymentPurpose.BALANCE
        ? balanceBefore
        : minDecimal(booking.upfrontAmount, balanceBefore);
    const amount = input.amount !== undefined
      ? new Prisma.Decimal(input.amount)
      : fallbackAmount;

    if (amount.lessThanOrEqualTo(0)) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_NOT_REQUIRED",
        "This booking does not require payment",
      );
    }

    if (amount.greaterThan(balanceBefore)) {
      throw new HttpError(
        422,
        "PAYMENT_OVERPAYMENT",
        "Payment amount cannot exceed the booking balance",
      );
    }

    if (
      purpose === PaymentPurpose.TOKEN &&
      booking.upfrontAmount.lessThanOrEqualTo(0)
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_NOT_REQUIRED",
        "This booking does not require upfront payment",
      );
    }

    const paidAfter = paidBefore.plus(amount);
    const balanceAfter = maxDecimal(
      zeroDecimal,
      booking.totalAmount.minus(paidAfter),
    );
    const nextPaymentStatus = resolveBookingPaymentStatus(
      booking.totalAmount,
      paidAfter,
    );

    if (booking.status === BookingStatus.PENDING) {
      await repo.confirmBooking(booking.id, nextPaymentStatus, tx);
      await repo.createBookingStatusHistory(
        {
          booking: {
            connect: {
              id: booking.id,
            },
          },
          fromStatus: booking.status,
          toStatus: BookingStatus.CONFIRMED,
          actor: {
            connect: {
              id: input.actorUserId ?? input.userId ?? booking.userId,
            },
          },
          note:
            purpose === PaymentPurpose.TOKEN
              ? "Token payment confirmed booking"
              : "Payment confirmed booking",
        },
        tx,
      );
    } else {
      await repo.updateBookingPaymentState(booking.id, nextPaymentStatus, tx);
    }

    const payment = await repo.createManualSucceededPayment(
      {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        ...(input.actorUserId !== undefined && {
          actorUserId: input.actorUserId,
        }),
        amount,
        currency: booking.property.tenant.defaultCurrency,
        idempotencyKey: input.idempotencyKey,
        purpose,
        method,
        ...(input.note !== undefined && { note: input.note }),
        paidAt: input.paidAt ?? new Date(),
        metadataSource:
          purpose === PaymentPurpose.BALANCE
            ? "DASHBOARD_BALANCE_PAYMENT"
            : "PUBLIC_MANUAL_PAYMENT",
      },
      tx,
    );

    return mapManualPaymentResult(payment, paidAfter, balanceAfter);
  });
