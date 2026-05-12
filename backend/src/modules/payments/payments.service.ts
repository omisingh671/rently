import { BookingStatus, PaymentProvider } from "@/generated/prisma/client.js";
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
  amount: Number(payment.amount),
  currency: payment.currency,
  idempotencyKey: payment.idempotencyKey,
  providerOrderId: payment.providerOrderId ?? null,
  providerPaymentId: payment.providerPaymentId ?? null,
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
});

const mapManualPaymentResult = (
  payment: repo.PaymentRecord,
): CreateManualPaymentDTO => ({
  payment: mapPayment(payment),
  booking: {
    id: payment.bookingId,
    status: payment.booking.status,
    totalAmount: Number(payment.booking.totalAmount),
  },
});

const assertSameIdempotentPayment = (
  payment: repo.PaymentRecord,
  input: CreateManualPaymentInput,
) => {
  if (
    payment.bookingId !== input.bookingId ||
    payment.userId !== input.userId ||
    payment.provider !== PaymentProvider.MANUAL
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
    const existingPayment = await repo.findPaymentByIdempotencyKey(
      input.idempotencyKey,
      tx,
    );

    if (existingPayment) {
      assertSameIdempotentPayment(existingPayment, input);
      return mapManualPaymentResult(existingPayment);
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

    if (
      booking.status === BookingStatus.CHECKED_IN ||
      booking.status === BookingStatus.CHECKED_OUT
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_CLOSED",
        "This booking can no longer accept payments",
      );
    }

    const succeededPayment = await repo.findSucceededPaymentByBooking(
      booking.id,
      tx,
    );

    if (succeededPayment) {
      throw new HttpError(
        409,
        "BOOKING_ALREADY_PAID",
        "Booking already has a successful payment",
      );
    }

    await repo.confirmBooking(booking.id, tx);
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
            id: input.userId,
          },
        },
        note: "Manual payment confirmed booking",
      },
      tx,
    );

    const payment = await repo.createManualSucceededPayment(
      {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        amount: booking.totalAmount,
        currency: booking.property.tenant.defaultCurrency,
        idempotencyKey: input.idempotencyKey,
        paidAt: new Date(),
      },
      tx,
    );

    return mapManualPaymentResult(payment);
  });
