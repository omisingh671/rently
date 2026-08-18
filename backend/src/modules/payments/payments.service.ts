import { createHash, randomUUID } from "node:crypto";
import {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { assertPropertyBusinessDateOpen } from "@/common/services/daily-close-guard.js";
import { env } from "@/config/env.js";
import { billingService } from "@/modules/billing/index.js";
import type {
  CreateGatewayPaymentIntentDTO,
  CreateManualPaymentDTO,
  PaymentDTO,
} from "./payments.dto.js";
import type {
  CreateGatewayPaymentIntentInput,
  CreateManualPaymentInput,
  VerifyGatewayPaymentInput,
} from "./payments.inputs.js";
import * as repo from "./payments.repository.js";
import { NotificationEventKey } from "@/generated/prisma/enums.js";
import { publishBookingNotification } from "@/modules/notifications/notifications.events.js";
import {
  getDefaultPaymentGateway,
  getPaymentGateway,
} from "./providers/payment-gateway.factory.js";
import { signMockWebhook } from "./providers/mock.gateway.js";
import type {
  GatewayEvent,
  GatewayWebhookHeaders,
} from "./providers/payment-gateway.adapter.js";

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
  failureCode: payment.failureCode ?? null,
  failureMessage: payment.failureMessage ?? null,
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

const assertPublicPaymentAccess = async (
  bookingId: string,
  input: { userId?: string; actorUserId?: string; checkoutToken?: string },
  tx: Prisma.TransactionClient,
) => {
  if (input.actorUserId !== undefined || input.userId !== undefined) {
    return;
  }

  if (input.checkoutToken === undefined) {
    throw new HttpError(
      403,
      "PAYMENT_ACCESS_FORBIDDEN",
      "A valid checkout token is required to pay for this booking",
    );
  }

  const lock = await repo.findReleasedInventoryLockByBookingToken(
    bookingId,
    input.checkoutToken,
    tx,
  );
  if (!lock) {
    throw new HttpError(
      403,
      "PAYMENT_ACCESS_FORBIDDEN",
      "A valid checkout token is required to pay for this booking",
    );
  }
};

const toMinorUnits = (amount: Prisma.Decimal) => {
  const minorUnits = amount.times(100);
  if (!minorUnits.isInteger() || minorUnits.lessThanOrEqualTo(0)) {
    throw new HttpError(
      422,
      "PAYMENT_AMOUNT_PRECISION_INVALID",
      "Payment amount has unsupported currency precision",
    );
  }
  return minorUnits.toNumber();
};

const getGatewayAmount = (
  booking: repo.BookingForPaymentRecord,
  purpose: PaymentPurpose,
) => {
  const { balanceAmount } = getBookingBalanceInfo(booking);
  return purpose === PaymentPurpose.BALANCE ||
    purpose === PaymentPurpose.FULL_PAYMENT
    ? balanceAmount
    : minDecimal(booking.upfrontAmount, balanceAmount);
};

const getBookingBalanceInfo = (
  booking: repo.BookingForPaymentRecord,
) => {
  const folioTotal = booking.folioCharges
    .filter((charge) => charge.status === "ACTIVE")
    .reduce((sum, charge) => sum.plus(charge.amount), zeroDecimal);

  const paidAmount = booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((sum, payment) => sum.plus(payment.amount), zeroDecimal);

  const refundedAmount = booking.payments.reduce(
    (sum, payment) =>
      sum.plus(
        payment.refunds
          .filter(
            (refund) => refund.status === PaymentRefundStatus.SUCCEEDED,
          )
          .reduce((total, refund) => total.plus(refund.amount), zeroDecimal),
      ),
    zeroDecimal,
  );

  const netPaidAmount = maxDecimal(zeroDecimal, paidAmount.minus(refundedAmount));
  const balanceAmount = maxDecimal(
    zeroDecimal,
    booking.totalAmount.plus(folioTotal).minus(netPaidAmount),
  );

  return {
    folioTotal,
    paidAmount,
    refundedAmount,
    netPaidAmount,
    balanceAmount,
  };
};

export const createManualPayment = async (
  input: CreateManualPaymentInput,
): Promise<CreateManualPaymentDTO> => {
  if (input.status !== undefined && env.NODE_ENV === "production") {
    throw new HttpError(
      403,
      "PAYMENT_STATUS_NOT_ALLOWED",
      "Manual payment status simulation is not available in production",
    );
  }

  const result = await repo.runPaymentTransaction(async (tx) => {
    const purpose = input.purpose ?? PaymentPurpose.TOKEN;
    const method = input.method ?? PaymentMethod.MANUAL;
    const existingPayment = await repo.findPaymentByIdempotencyKey(
      input.idempotencyKey,
      tx,
    );

    if (existingPayment) {
      assertSameIdempotentPayment(existingPayment, input);
      await assertPublicPaymentAccess(existingPayment.bookingId, input, tx);
      const bookingForExisting = await repo.findBookingForPayment(
        existingPayment.bookingId,
        undefined,
        tx,
      );
      if (!bookingForExisting) {
        throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
      }
      const { paidAmount, balanceAmount } = getBookingBalanceInfo(bookingForExisting);
      if (existingPayment.status === PaymentStatus.SUCCEEDED) {
        if (balanceAmount.equals(zeroDecimal)) {
          await billingService.createInvoiceForBooking(existingPayment.bookingId, tx);
        }
        await billingService.createReceiptForPayment(existingPayment.id, tx);
      }
      return mapManualPaymentResult(existingPayment, paidAmount, balanceAmount);
    }

    await assertPublicPaymentAccess(input.bookingId, input, tx);

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

    const paidAt = input.paidAt ?? new Date();
    await assertPropertyBusinessDateOpen(
      booking.propertyId,
      { at: paidAt, tx, operation: "Financial posting" },
    );

    if (
      booking.status === BookingStatus.CHECKED_OUT &&
      input.actorUserId === undefined
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_CLOSED",
        "This booking can no longer accept payments",
      );
    }

    if (
      booking.status === BookingStatus.PENDING &&
      booking.paymentExpiresAt !== null &&
      booking.paymentExpiresAt <= new Date()
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_EXPIRED",
        "The payment deadline has passed. Start a new booking.",
      );
    }

    const {
      folioTotal,
      paidAmount: paidBefore,
      netPaidAmount: netPaidBefore,
      balanceAmount: balanceBefore,
    } = getBookingBalanceInfo(booking);

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
      purpose === PaymentPurpose.BALANCE ||
      purpose === PaymentPurpose.FULL_PAYMENT
        ? balanceBefore
        : minDecimal(booking.upfrontAmount, balanceBefore);
    const amount = input.amount !== undefined
      ? new Prisma.Decimal(input.amount)
      : fallbackAmount;

    if (
      input.actorUserId === undefined &&
      input.amount !== undefined &&
      !amount.equals(fallbackAmount)
    ) {
      throw new HttpError(
        422,
        "PAYMENT_AMOUNT_MISMATCH",
        purpose === PaymentPurpose.TOKEN
          ? "Token payment amount must match the amount required by the booking policy"
          : "Payment amount must match the outstanding booking balance",
      );
    }

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

    if (input.status === PaymentStatus.FAILED) {
      const payment = await repo.createManualPaymentRecord(
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
          status: PaymentStatus.FAILED,
          failureCode: "SIMULATED_FAILURE",
          failureMessage: "User simulated a failed payment on the test page.",
          ...(input.note !== undefined && { note: input.note }),
          paidAt: null,
          metadataSource: "PUBLIC_MANUAL_PAYMENT_SIMULATION",
          ...(input.metadata !== undefined && { metadata: input.metadata }),
        },
        tx,
      );

      return mapManualPaymentResult(payment, paidBefore, balanceBefore);
    }

    const paidAfter = paidBefore.plus(amount);
    const netPaidAfter = netPaidBefore.plus(amount);
    const balanceAfter = maxDecimal(
      zeroDecimal,
      booking.totalAmount.plus(folioTotal).minus(netPaidAfter),
    );
    const nextPaymentStatus = resolveBookingPaymentStatus(
      booking.totalAmount.plus(folioTotal),
      paidAfter,
    );

    const confirmationAmount =
      booking.paymentPolicy === BookingPaymentPolicy.TOKEN_AT_BOOKING
        ? minDecimal(booking.upfrontAmount, booking.totalAmount.plus(folioTotal))
        : zeroDecimal;
    const canConfirmPendingBooking =
      booking.paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT ||
      netPaidAfter.greaterThanOrEqualTo(confirmationAmount);

    if (booking.status === BookingStatus.PENDING && canConfirmPendingBooking) {
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
      await repo.releaseInventoryLocksByBooking(booking.id, new Date(), tx);
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
        paidAt,
        metadataSource:
          purpose === PaymentPurpose.BALANCE && input.actorUserId !== undefined
            ? "DASHBOARD_BALANCE_PAYMENT"
            : "PUBLIC_MANUAL_PAYMENT",
        ...(input.metadata !== undefined && { metadata: input.metadata }),
      },
      tx,
    );

    if (balanceAfter.equals(zeroDecimal)) {
      await billingService.createInvoiceForBooking(booking.id, tx);
    }
    await billingService.createReceiptForPayment(payment.id, tx);

    return mapManualPaymentResult(payment, paidAfter, balanceAfter);
  });
  if (result.payment.status === PaymentStatus.SUCCEEDED) {
    await publishBookingNotification({
      eventKey: NotificationEventKey.PAYMENT_SUCCEEDED,
      businessEventId: result.payment.id,
      bookingId: result.payment.bookingId,
      amount: String(result.payment.amount),
      currency: result.payment.currency,
    });
  }
  return result;
};

const getPaymentResult = async (
  paymentId: string,
): Promise<CreateManualPaymentDTO> => {
  const payment = await repo.findPaymentById(paymentId);
  if (!payment) {
    throw new HttpError(404, "PAYMENT_NOT_FOUND", "Payment not found");
  }
  const booking = await repo.findBookingForPayment(payment.bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  const { paidAmount, balanceAmount } = getBookingBalanceInfo(booking);
  return mapManualPaymentResult(payment, paidAmount, balanceAmount);
};

const assertGatewayIntentMatches = (
  payment: repo.PaymentRecord,
  input: CreateGatewayPaymentIntentInput,
  amount: Prisma.Decimal,
  purpose: PaymentPurpose,
  provider: PaymentProvider,
) => {
  if (
    payment.bookingId !== input.bookingId ||
    payment.provider !== provider ||
    payment.method !== PaymentMethod.ONLINE_GATEWAY ||
    payment.purpose !== purpose ||
    !payment.amount.equals(amount)
  ) {
    throw new HttpError(
      409,
      "IDEMPOTENCY_KEY_REUSED",
      "Idempotency key was already used for another payment",
    );
  }
};

export const createGatewayPaymentIntent = async (
  input: CreateGatewayPaymentIntentInput,
): Promise<CreateGatewayPaymentIntentDTO> => {
  const gateway = getDefaultPaymentGateway();
  const intent = await repo.runPaymentTransaction(async (tx) => {
    await assertPublicPaymentAccess(input.bookingId, input, tx);
    const booking = await repo.findBookingForPayment(
      input.bookingId,
      input.userId,
      tx,
    );
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.NO_SHOW ||
      booking.status === BookingStatus.CHECKED_OUT
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_CLOSED",
        "This booking can no longer accept online payments",
      );
    }
    if (
      booking.status === BookingStatus.PENDING &&
      booking.paymentExpiresAt !== null &&
      booking.paymentExpiresAt <= new Date()
    ) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_EXPIRED",
        "The payment deadline has passed. Start a new booking.",
      );
    }

    const purpose = input.purpose ?? PaymentPurpose.TOKEN;
    const amount = getGatewayAmount(booking, purpose);
    if (amount.lessThanOrEqualTo(0)) {
      throw new HttpError(
        409,
        "BOOKING_PAYMENT_NOT_REQUIRED",
        "This booking does not require payment",
      );
    }
    if (
      input.amount !== undefined &&
      !amount.equals(new Prisma.Decimal(input.amount))
    ) {
      throw new HttpError(
        422,
        "PAYMENT_AMOUNT_MISMATCH",
        "Payment amount must match the server-calculated amount",
      );
    }

    const existing = await repo.findPaymentByIdempotencyKey(
      input.idempotencyKey,
      tx,
    );
    if (existing) {
      assertGatewayIntentMatches(existing, input, amount, purpose, gateway.provider);
      return { payment: existing, booking, created: false };
    }

    await assertPropertyBusinessDateOpen(booking.propertyId, {
      operation: "Online payment initiation",
      tx,
    });
    const payment = await repo.createGatewayPaymentRecord(
      {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        provider: gateway.provider,
        amount,
        currency: booking.property.tenant.defaultCurrency,
        idempotencyKey: input.idempotencyKey,
        purpose,
        metadata: { gatewayMode: gateway.mode },
      },
      tx,
    );
    return { payment, booking, created: true };
  });

  let payment = intent.payment;
  let checkoutSession = null;
  if (intent.created) {
    try {
      checkoutSession = await gateway.createCheckout({
        paymentId: payment.id,
        amountMinor: toMinorUnits(payment.amount),
        currency: payment.currency,
        receipt: payment.id,
        notes: {
          paymentId: payment.id,
          bookingId: payment.bookingId,
          purpose: payment.purpose,
        },
      });
      if (
        checkoutSession.amountMinor !== toMinorUnits(payment.amount) ||
        checkoutSession.currency !== payment.currency
      ) {
        throw new HttpError(
          502,
          "PAYMENT_PROVIDER_AMOUNT_MISMATCH",
          "Payment provider returned an invalid order amount",
        );
      }
      payment = await repo.setGatewayOrder(
        payment.id,
        checkoutSession.providerOrderId,
      );
    } catch (error) {
      await repo.markGatewayOrderCreationFailed(
        payment.id,
        "ORDER_CREATION_FAILED",
        error instanceof Error ? error.message : "Gateway order creation failed",
      );
      throw error;
    }
  } else if (payment.providerOrderId === null) {
    throw new HttpError(
      409,
      "PAYMENT_INITIALIZATION_IN_PROGRESS",
      "Payment initialization is still in progress. Retry shortly.",
    );
  }

  if (payment.status !== PaymentStatus.PENDING || payment.providerOrderId === null) {
    throw new HttpError(
      409,
      "PAYMENT_INTENT_NOT_AVAILABLE",
      "This payment attempt can no longer be opened",
    );
  }

  checkoutSession ??= await gateway.resumeCheckout({
    providerOrderId: payment.providerOrderId,
    amountMinor: toMinorUnits(payment.amount),
    currency: payment.currency,
  });

  const result = await getPaymentResult(payment.id);
  return {
    ...result,
    checkout: {
      mode: gateway.mode,
      provider: gateway.provider,
      strategy: checkoutSession.launch.strategy,
      providerOrderId: payment.providerOrderId,
      amountMinor: toMinorUnits(payment.amount),
      currency: payment.currency,
      name: "Rently",
      description: `${payment.purpose.replaceAll("_", " ")} for booking ${payment.booking.bookingRef}`,
      ...(checkoutSession.launch.strategy === "SDK" && {
        ...(checkoutSession.launch.publicKey !== undefined && {
          publicKey: checkoutSession.launch.publicKey,
        }),
        ...(checkoutSession.launch.sessionToken !== undefined && {
          sessionToken: checkoutSession.launch.sessionToken,
        }),
        ...(checkoutSession.launch.providerData !== undefined && {
          providerData: checkoutSession.launch.providerData,
        }),
      }),
      ...(checkoutSession.launch.strategy === "REDIRECT" && {
        redirectUrl: checkoutSession.launch.redirectUrl,
      }),
    },
  };
};

const finalizeGatewayPayment = async (input: {
  provider: PaymentProvider;
  paymentId: string;
  providerOrderId: string;
  providerPaymentId: string;
  providerSignature?: string;
}) => {
  const result = await repo.runPaymentTransaction(async (tx) => {
    const current = await repo.findPaymentById(input.paymentId, tx);
    if (!current || current.provider !== input.provider) {
      throw new HttpError(404, "PAYMENT_NOT_FOUND", "Gateway payment not found");
    }
    if (current.providerOrderId !== input.providerOrderId) {
      throw new HttpError(
        422,
        "PAYMENT_ORDER_MISMATCH",
        "Gateway order does not match the local payment",
      );
    }
    if (
      current.status === PaymentStatus.SUCCEEDED &&
      current.providerPaymentId !== input.providerPaymentId
    ) {
      throw new HttpError(
        409,
        "PAYMENT_ALREADY_FINALIZED",
        "Payment was already finalized with another provider payment",
      );
    }

    if (current.status !== PaymentStatus.SUCCEEDED) {
      await repo.markGatewayPaymentSucceeded(
        current.id,
        {
          providerPaymentId: input.providerPaymentId,
          ...(input.providerSignature !== undefined && {
            providerSignature: input.providerSignature,
          }),
          paidAt: new Date(),
        },
        tx,
      );
    }

    const booking = await repo.findBookingForPayment(current.bookingId, undefined, tx);
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    const { folioTotal, paidAmount, netPaidAmount, balanceAmount } =
      getBookingBalanceInfo(booking);
    const totalDue = booking.totalAmount.plus(folioTotal);
    const nextPaymentStatus = resolveBookingPaymentStatus(totalDue, netPaidAmount);
    const confirmationAmount =
      booking.paymentPolicy === BookingPaymentPolicy.TOKEN_AT_BOOKING
        ? minDecimal(booking.upfrontAmount, totalDue)
        : zeroDecimal;
    const paymentDeadlineOpen =
      booking.paymentExpiresAt === null || booking.paymentExpiresAt > new Date();
    const canConfirm =
      booking.status === BookingStatus.PENDING &&
      paymentDeadlineOpen &&
      (booking.paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT ||
        netPaidAmount.greaterThanOrEqualTo(confirmationAmount));

    if (canConfirm) {
      await repo.confirmBooking(booking.id, nextPaymentStatus, tx);
      await repo.createBookingStatusHistory(
        {
          booking: { connect: { id: booking.id } },
          fromStatus: booking.status,
          toStatus: BookingStatus.CONFIRMED,
          actor: { connect: { id: booking.userId } },
          note: "Verified gateway payment confirmed booking",
        },
        tx,
      );
      await repo.releaseInventoryLocksByBooking(booking.id, new Date(), tx);
    } else {
      await repo.updateBookingPaymentState(booking.id, nextPaymentStatus, tx);
    }

    if (balanceAmount.equals(zeroDecimal)) {
      await billingService.createInvoiceForBooking(booking.id, tx);
    }
    await billingService.createReceiptForPayment(current.id, tx);
    return { bookingId: booking.id, paidAmount };
  });

  await publishBookingNotification({
    eventKey: NotificationEventKey.PAYMENT_SUCCEEDED,
    businessEventId: input.providerPaymentId,
    bookingId: result.bookingId,
  });
  return getPaymentResult(input.paymentId);
};

export const verifyGatewayPayment = async (input: VerifyGatewayPaymentInput) => {
  const payment = await repo.findPaymentById(input.paymentId);
  if (!payment || payment.provider === PaymentProvider.MANUAL) {
    throw new HttpError(404, "PAYMENT_NOT_FOUND", "Gateway payment not found");
  }
  await repo.runPaymentTransaction((tx) =>
    assertPublicPaymentAccess(payment.bookingId, input, tx),
  );
  const gateway = getPaymentGateway(payment.provider);
  if (
    payment.providerOrderId !== input.providerOrderId ||
    !gateway.verifyCheckoutResult({
      orderId: input.providerOrderId,
      ...(input.providerPaymentId !== undefined && {
        paymentId: input.providerPaymentId,
      }),
      ...(input.providerSignature !== undefined && {
        signature: input.providerSignature,
      }),
    })
  ) {
    throw new HttpError(
      400,
      "PAYMENT_SIGNATURE_INVALID",
      "Payment confirmation signature is invalid",
    );
  }
  const providerPayment = await gateway.fetchPayment({
    providerOrderId: input.providerOrderId,
    ...(input.providerPaymentId !== undefined && {
      providerPaymentId: input.providerPaymentId,
    }),
  });
  if (
    providerPayment.status !== "captured" ||
    providerPayment.orderId !== input.providerOrderId ||
    providerPayment.amountMinor !== toMinorUnits(payment.amount) ||
    providerPayment.currency !== payment.currency
  ) {
    throw new HttpError(
      409,
      "PAYMENT_NOT_CAPTURED",
      "The provider has not confirmed this payment as captured",
    );
  }
  if (input.providerSignature !== undefined) {
    await repo.setGatewayCheckoutSignature(payment.id, input.providerSignature);
  }
  return finalizeGatewayPayment({
    provider: payment.provider,
    paymentId: payment.id,
    providerOrderId: input.providerOrderId,
    providerPaymentId: providerPayment.id,
    ...(input.providerSignature !== undefined && {
      providerSignature: input.providerSignature,
    }),
  });
};

const finalizeGatewayRefund = async (
  provider: PaymentProvider,
  event: Extract<GatewayEvent, { type: "REFUND_SUCCEEDED" | "REFUND_FAILED" }>,
) => {
  const refund = await repo.findRefundByProviderRefundId(
    provider,
    event.providerRefundId,
  );
  if (!refund) {
    throw new HttpError(404, "REFUND_NOT_FOUND", "Gateway refund not found");
  }
  if (
    event.amountMinor !== toMinorUnits(refund.amount) ||
    event.currency !== refund.currency
  ) {
    throw new HttpError(
      422,
      "REFUND_PROVIDER_AMOUNT_MISMATCH",
      "Webhook amount or currency does not match the refund",
    );
  }

  const succeeded = event.type === "REFUND_SUCCEEDED";

  const result = await repo.runPaymentTransaction(async (tx) => {
    await repo.updateGatewayRefundStatus(
      refund.id,
      {
        status: succeeded
          ? PaymentRefundStatus.SUCCEEDED
          : PaymentRefundStatus.FAILED,
        providerRefundStatus: event.providerStatus,
        ...(succeeded && { processedAt: new Date() }),
      },
      tx,
    );
    const booking = await repo.findBookingForPayment(refund.bookingId, undefined, tx);
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    if (succeeded) {
      const { folioTotal, paidAmount, refundedAmount, netPaidAmount } =
        getBookingBalanceInfo(booking);
      const paymentStatus =
        paidAmount.greaterThan(0) && refundedAmount.greaterThanOrEqualTo(paidAmount)
          ? BookingPaymentStatus.REFUNDED
          : resolveBookingPaymentStatus(
              booking.totalAmount.plus(folioTotal),
              netPaidAmount,
            );
      await repo.updateBookingPaymentState(booking.id, paymentStatus, tx);
      if (
        refund.refundRequestId !== null &&
        refundedAmount.greaterThanOrEqualTo(paidAmount)
      ) {
        await repo.updateRefundRequestStatus(
          refund.refundRequestId,
          {
            status: "FULFILLED",
            fulfilledAt: new Date(),
            reviewedAt: new Date(),
          },
          tx,
        );
      }
    }
    return booking;
  });

  if (succeeded) {
    await publishBookingNotification({
      eventKey: NotificationEventKey.REFUND_SUCCEEDED,
      businessEventId: event.providerRefundId,
      bookingId: result.id,
      amount: refund.amount.toString(),
      currency: refund.currency,
    });
  }
};

export const processGatewayWebhook = async (input: {
  provider: PaymentProvider;
  rawBody: Buffer;
  headers: GatewayWebhookHeaders;
}) => {
  const gateway = getPaymentGateway(input.provider);
  const parsed = gateway.parseWebhook(input.rawBody, input.headers);
  const payloadHash = createHash("sha256").update(input.rawBody).digest("hex");
  const providerEventId = parsed.providerEventId?.trim() || payloadHash;
  const inbox = await repo.createWebhookEventIfMissing({
    provider: input.provider,
    providerEventId,
    eventType: parsed.eventType,
    payload: parsed.payload as Prisma.InputJsonValue,
    payloadHash,
  });
  if (!inbox.created && inbox.event.status === "PROCESSED") {
    return { processed: true, duplicate: true };
  }

  await repo.markWebhookEventProcessing(inbox.event.id);
  try {
    if (parsed.event?.type === "PAYMENT_SUCCEEDED") {
      const payment = await repo.findPaymentByProviderOrderId(
        input.provider,
        parsed.event.providerOrderId,
      );
      if (!payment) {
        throw new HttpError(404, "PAYMENT_NOT_FOUND", "Gateway order not found");
      }
      if (
        parsed.event.amountMinor !== toMinorUnits(payment.amount) ||
        parsed.event.currency !== payment.currency
      ) {
        throw new HttpError(
          422,
          "PAYMENT_PROVIDER_AMOUNT_MISMATCH",
          "Webhook amount or currency does not match the payment intent",
        );
      }
      await finalizeGatewayPayment({
        provider: input.provider,
        paymentId: payment.id,
        providerOrderId: parsed.event.providerOrderId,
        providerPaymentId: parsed.event.providerPaymentId,
      });
    } else if (parsed.event?.type === "PAYMENT_FAILED") {
      const payment = await repo.findPaymentByProviderOrderId(
        input.provider,
        parsed.event.providerOrderId,
      );
      if (payment) {
        await repo.markGatewayPaymentFailed(
          payment.id,
          parsed.event.failureCode ?? "PAYMENT_FAILED",
          parsed.event.failureMessage ?? "The payment provider reported failure",
        );
      }
    } else if (
      parsed.event?.type === "REFUND_SUCCEEDED" ||
      parsed.event?.type === "REFUND_FAILED"
    ) {
      await finalizeGatewayRefund(input.provider, parsed.event);
    }
    await repo.markWebhookEventProcessed(inbox.event.id);
    return { processed: true, duplicate: false };
  } catch (error) {
    await repo.markWebhookEventFailed(
      inbox.event.id,
      error instanceof Error ? error.message : "Webhook processing failed",
    );
    throw error;
  }
};

export const completeMockGatewayPayment = async (input: {
  userId?: string;
  paymentId: string;
  checkoutToken?: string;
  outcome: "SUCCEEDED" | "FAILED";
}) => {
  if (env.PAYMENT_GATEWAY_MODE !== "mock") {
    throw new HttpError(404, "MOCK_PAYMENT_DISABLED", "Mock payments are disabled");
  }
  const payment = await repo.findPaymentById(input.paymentId);
  if (!payment || payment.providerOrderId === null) {
    throw new HttpError(404, "PAYMENT_NOT_FOUND", "Gateway payment not found");
  }
  await repo.runPaymentTransaction((tx) =>
    assertPublicPaymentAccess(payment.bookingId, input, tx),
  );
  if (payment.status === PaymentStatus.SUCCEEDED) {
    return getPaymentResult(payment.id);
  }
  if (payment.status !== PaymentStatus.PENDING) {
    return getPaymentResult(payment.id);
  }

  const providerPaymentId = `pay_mock_${randomUUID()}`;
  const eventType =
    input.outcome === "SUCCEEDED" ? "mock.payment.succeeded" : "mock.payment.failed";
  const body = {
    providerEventId: `mock:${providerPaymentId}:${eventType}`,
    eventType,
    payload: {
      paymentId: providerPaymentId,
      orderId: payment.providerOrderId,
      amountMinor: toMinorUnits(payment.amount),
      currency: payment.currency,
    },
    event:
      input.outcome === "SUCCEEDED"
        ? {
            type: "PAYMENT_SUCCEEDED" as const,
            providerOrderId: payment.providerOrderId,
            providerPaymentId,
            amountMinor: toMinorUnits(payment.amount),
            currency: payment.currency,
            providerStatus: "captured",
          }
        : {
            type: "PAYMENT_FAILED" as const,
            providerOrderId: payment.providerOrderId,
            providerPaymentId,
            amountMinor: toMinorUnits(payment.amount),
            currency: payment.currency,
            providerStatus: "failed",
            failureCode: "MOCK_PAYMENT_FAILED",
            failureMessage: "Mock gateway payment failed",
          },
  };
  const rawBody = Buffer.from(JSON.stringify(body));
  await processGatewayWebhook({
    provider: payment.provider,
    rawBody,
    headers: { "x-mock-signature": signMockWebhook(rawBody.toString("utf8")) },
  });
  return getPaymentResult(payment.id);
};
