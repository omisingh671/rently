import { randomUUID } from "node:crypto";
import {
  BookingRefundRequestStatus,
  BookingStatus,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
  NotificationEventKey,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { parsePolicySnapshot } from "@/modules/booking-policy/booking-policy.policy.js";
import { createManualPayment } from "@/modules/payments/payments.service.js";
import type {
  RecordDashboardBookingPaymentInput,
  RecordDashboardBookingRefundInput,
  UpdateDashboardRefundRequestInput,
} from "./bookings.inputs.js";
import type { DashboardActor } from "./bookings.access.js";
import {
  assertManualPaymentProof,
} from "./bookings.helper.js";
import {
  assertBookingCanAcceptPayment,
  assertRefundProviderAvailable,
  getActiveRefundRequest,
  getBookingBalanceAmount,
  getBookingRefundableAmount,
  getBookingRefundedAmount,
  getPaymentRefundableAmount,
  getRefundPaymentStatus,
} from "./bookings.financials.js";
import * as repo from "./bookings.repository.js";
import { publishBookingNotification } from "@/modules/notifications/notifications.events.js";

export const recordBookingBalancePaymentForBooking = async (
  actor: DashboardActor,
  booking: repo.DashboardBookingRecord,
  input: RecordDashboardBookingPaymentInput,
) => {
  assertBookingCanAcceptPayment(booking);
  assertManualPaymentProof(input);

  const balanceAmount = getBookingBalanceAmount(booking);
  const amount = new Prisma.Decimal(input.amount);

  if (balanceAmount.lessThanOrEqualTo(0)) {
    throw new HttpError(
      409,
      "BOOKING_ALREADY_PAID",
      "Booking is already fully paid",
    );
  }

  if (amount.greaterThan(balanceAmount)) {
    throw new HttpError(
      422,
      "PAYMENT_OVERPAYMENT",
      "Payment amount cannot exceed the booking balance",
    );
  }

  await createManualPayment({
    actorUserId: actor.id,
    bookingId: booking.id,
    idempotencyKey:
      input.idempotencyKey ?? `dashboard-balance-${booking.id}-${randomUUID()}`,
    amount: input.amount,
    purpose: PaymentPurpose.BALANCE,
    method: input.method,
    metadata: {
      recordedVia: "DASHBOARD",
      ...(input.referenceId !== undefined && {
        manualReferenceId: input.referenceId.trim(),
      }),
      ...(input.payerDetail !== undefined && {
        manualPayerDetail: input.payerDetail.trim(),
      }),
    },
    ...(input.note !== undefined && { note: input.note }),
    ...(input.paidAt !== undefined && { paidAt: input.paidAt }),
  });

  const updatedBooking = await repo.findBookingById(booking.id);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return updatedBooking;
};

export const recordBookingRefundForBooking = async (
  actor: DashboardActor,
  booking: repo.DashboardBookingRecord,
  input: RecordDashboardBookingRefundInput,
) => {
  if (
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.NO_SHOW &&
    booking.status !== BookingStatus.CHECKED_OUT
  ) {
    throw new HttpError(
      409,
      "BOOKING_REFUND_NOT_ALLOWED",
      "Refunds can be recorded only for cancelled, no-show, or policy-approved early-checkout bookings",
    );
  }

  const amount = new Prisma.Decimal(input.amount);
  if (booking.status === BookingStatus.CHECKED_OUT) {
    const checkoutEvent = [...booking.operationEvents]
      .reverse()
      .find((event) => event.eventType === "CHECK_OUT");
    const metadata =
      checkoutEvent?.metadata !== null &&
      typeof checkoutEvent?.metadata === "object" &&
      !Array.isArray(checkoutEvent.metadata)
        ? checkoutEvent.metadata
        : {};
    const approvedAmount = new Prisma.Decimal(
      typeof metadata.refundAmount === "string" ? metadata.refundAmount : 0,
    );
    const remainingApproved = Prisma.Decimal.max(
      0,
      approvedAmount.minus(getBookingRefundedAmount(booking)),
    );
    if (approvedAmount.lessThanOrEqualTo(0) || amount.greaterThan(remainingApproved)) {
      throw new HttpError(
        422,
        "EARLY_CHECKOUT_REFUND_LIMIT",
        "Refund exceeds the frozen early-checkout policy amount",
      );
    }
  }
  const payment = booking.payments.find((item) => item.id === input.paymentId);

  if (!payment || payment.bookingId !== booking.id) {
    throw new HttpError(
      404,
      "PAYMENT_NOT_FOUND",
      "Payment was not found for this booking",
    );
  }

  if (payment.status !== PaymentStatus.SUCCEEDED) {
    throw new HttpError(
      409,
      "PAYMENT_NOT_REFUNDABLE",
      "Only successful payments can be refunded",
    );
  }

  assertRefundProviderAvailable(payment.provider, input.method);

  const policySnapshot = parsePolicySnapshot(booking.policySnapshot);
  if (
    payment.purpose === PaymentPurpose.TOKEN &&
    policySnapshot?.tokenRefundable === false
  ) {
    throw new HttpError(
      422,
      "TOKEN_NOT_REFUNDABLE",
      "This booking policy marks the token payment as non-refundable",
    );
  }

  const refundRequest =
    input.refundRequestId !== undefined
      ? booking.refundRequests.find(
          (request) => request.id === input.refundRequestId,
        ) ?? null
      : getActiveRefundRequest(booking);

  if (input.refundRequestId !== undefined && refundRequest === null) {
    throw new HttpError(
      404,
      "REFUND_REQUEST_NOT_FOUND",
      "Refund request was not found for this booking",
    );
  }

  if (
    refundRequest !== null &&
    (refundRequest.status === BookingRefundRequestStatus.REJECTED ||
      refundRequest.status === BookingRefundRequestStatus.FULFILLED ||
      refundRequest.status === BookingRefundRequestStatus.CANCELLED)
  ) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_CLOSED",
      "This refund request is already closed",
    );
  }

  const existingRefund =
    input.idempotencyKey !== undefined
      ? await repo.findRefundByIdempotencyKey(input.idempotencyKey)
      : null;

  if (existingRefund) {
    if (
      existingRefund.bookingId !== booking.id ||
      existingRefund.paymentId !== payment.id ||
      !existingRefund.amount.equals(amount)
    ) {
      throw new HttpError(
        409,
        "REFUND_IDEMPOTENCY_CONFLICT",
        "Idempotency key was already used for a different refund",
      );
    }

    await publishBookingNotification({
      eventKey: NotificationEventKey.REFUND_SUCCEEDED,
      businessEventId: existingRefund.id,
      bookingId: booking.id,
      amount: existingRefund.amount.toString(),
      currency: existingRefund.currency,
    });
    return booking;
  }

  const refundableAmount = getPaymentRefundableAmount(payment);
  if (amount.greaterThan(refundableAmount)) {
    throw new HttpError(
      422,
      "REFUND_OVERPAYMENT",
      "Refund amount cannot exceed the refundable payment balance",
    );
  }

  const idempotencyKey =
    input.idempotencyKey ??
    `dashboard-refund-${booking.id}-${payment.id}-${randomUUID()}`;

  const projectedBooking = {
    ...booking,
    payments: booking.payments.map((item) =>
      item.id === payment.id
        ? {
            ...item,
            refunds: [
              ...item.refunds,
              {
                id: idempotencyKey,
                bookingId: booking.id,
                paymentId: payment.id,
                propertyId: booking.propertyId,
                userId: booking.userId,
                refundRequestId: refundRequest?.id ?? null,
                provider: payment.provider,
                status: PaymentRefundStatus.SUCCEEDED,
                method: input.method,
                amount,
                currency: payment.currency,
                reason: input.reason,
                idempotencyKey,
                providerRefundId: null,
                providerRefundStatus: null,
                metadata: null,
                processedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }
        : item,
    ),
  };

  const projectedRefundableAmount = getBookingRefundableAmount(projectedBooking);
  const refundRequestUpdate =
    refundRequest === null
      ? undefined
      : {
          id: refundRequest.id,
          data: {
            status: projectedRefundableAmount.lessThanOrEqualTo(0)
              ? BookingRefundRequestStatus.FULFILLED
              : BookingRefundRequestStatus.IN_REVIEW,
            reviewedBy: {
              connect: {
                id: actor.id,
              },
            },
            reviewedAt: new Date(),
            ...(projectedRefundableAmount.lessThanOrEqualTo(0) && {
              fulfilledAt: new Date(),
            }),
          },
        };

  const updatedBooking = await repo.createPaymentRefundForBooking(
    {
      booking: {
        connect: {
          id: booking.id,
        },
      },
      payment: {
        connect: {
          id: payment.id,
        },
      },
      property: {
        connect: {
          id: booking.propertyId,
        },
      },
      user: {
        connect: {
          id: booking.userId,
        },
      },
      ...(refundRequest !== null && {
        refundRequest: {
          connect: {
            id: refundRequest.id,
          },
        },
      }),
      provider: payment.provider,
      status: PaymentRefundStatus.SUCCEEDED,
      method: input.method,
      amount,
      currency: payment.currency,
      reason: input.reason,
      idempotencyKey,
      metadata: {
        recordedByUserId: actor.id,
        source: "DASHBOARD_MANUAL_REFUND",
      },
      processedAt: new Date(),
    },
    getRefundPaymentStatus(projectedBooking),
    refundRequestUpdate,
  );
  await publishBookingNotification({
    eventKey: NotificationEventKey.REFUND_SUCCEEDED,
    businessEventId: idempotencyKey,
    bookingId: booking.id,
    amount: amount.toString(),
    currency: payment.currency,
  });
  return updatedBooking;
};

export const updateRefundRequestForBooking = async (
  actor: DashboardActor,
  bookingId: string,
  requestId: string,
  input: UpdateDashboardRefundRequestInput,
) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  const refundRequest = booking.refundRequests.find(
    (request) => request.id === requestId,
  );
  if (!refundRequest) {
    throw new HttpError(
      404,
      "REFUND_REQUEST_NOT_FOUND",
      "Refund request was not found for this booking",
    );
  }

  if (
    refundRequest.status === BookingRefundRequestStatus.FULFILLED ||
    refundRequest.status === BookingRefundRequestStatus.CANCELLED
  ) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_CLOSED",
      "This refund request is already closed",
    );
  }

  if (
    input.status === BookingRefundRequestStatus.REJECTED &&
    !input.adminNote?.trim()
  ) {
    throw new HttpError(
      422,
      "REFUND_REJECTION_NOTE_REQUIRED",
      "Admin note is required when rejecting a refund request",
    );
  }

  await repo.updateRefundRequestById(requestId, {
    ...(input.status !== undefined && { status: input.status }),
    ...(input.adminNote !== undefined && { adminNote: input.adminNote }),
    reviewedBy: {
      connect: {
        id: actor.id,
      },
    },
    reviewedAt: new Date(),
  });

  const updatedBooking = await repo.findBookingById(bookingId);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return updatedBooking;
};
