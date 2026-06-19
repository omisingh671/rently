import {
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingStatus,
  FolioChargeStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { parsePolicySnapshot } from "@/modules/booking-policy/booking-policy.policy.js";
import type { RecordDashboardBookingRefundInput } from "./bookings.inputs.js";
import * as repo from "./bookings.repository.js";

export const getBookingPaidAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0),
    );

const refundReservedStatuses: readonly PaymentRefundStatus[] = [
  PaymentRefundStatus.PENDING,
  PaymentRefundStatus.SUCCEEDED,
] as const;

const isRefundReserved = (status: PaymentRefundStatus) =>
  refundReservedStatuses.includes(status);

const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] = [
  BookingRefundRequestStatus.REQUESTED,
  BookingRefundRequestStatus.IN_REVIEW,
];

export const getActiveRefundRequest = (booking: repo.DashboardBookingRecord) =>
  booking.refundRequests.find((request) =>
    activeRefundRequestStatuses.includes(request.status),
  ) ?? null;

export const getPaymentRefundedAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) =>
  payment.refunds
    .filter((refund) => isRefundReserved(refund.status))
    .reduce((total, refund) => total.plus(refund.amount), new Prisma.Decimal(0));

export const getBookingRefundedAmount = (
  booking: repo.DashboardBookingRecord,
) =>
  booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundedAmount(payment)),
    new Prisma.Decimal(0),
  );

export const getPaymentRefundableAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) => {
  if (payment.status !== PaymentStatus.SUCCEEDED) {
    return new Prisma.Decimal(0);
  }

  const refundableAmount = payment.amount.minus(getPaymentRefundedAmount(payment));
  return refundableAmount.lessThan(0) ? new Prisma.Decimal(0) : refundableAmount;
};

const getJsonNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Prisma.Decimal(value)
    : new Prisma.Decimal(0);

const getBookingNonRefundableTaxAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const taxBreakdown = booking.taxBreakdown;

  if (!Array.isArray(taxBreakdown)) {
    return new Prisma.Decimal(0);
  }

  return taxBreakdown.reduce((total, item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return total;
    }

    const tax = item as Record<string, unknown>;

    if (tax.isRefundable !== false) {
      return total;
    }

    return total.plus(getJsonNumber(tax.taxAmount));
  }, new Prisma.Decimal(0));
};

const getBookingNonRefundableTokenAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const policySnapshot = parsePolicySnapshot(booking.policySnapshot);

  if (policySnapshot?.tokenRefundable !== false) {
    return new Prisma.Decimal(0);
  }

  return booking.payments
    .filter(
      (payment) =>
        payment.status === PaymentStatus.SUCCEEDED &&
        payment.purpose === PaymentPurpose.TOKEN,
    )
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
};

export const getBookingRefundableAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const baseRefundableAmount = booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundableAmount(payment)),
    new Prisma.Decimal(0),
  );

  const refundableAmount = baseRefundableAmount
    .minus(getBookingNonRefundableTaxAmount(booking))
    .minus(getBookingNonRefundableTokenAmount(booking));

  return refundableAmount.lessThan(0) ? new Prisma.Decimal(0) : refundableAmount;
};

export const syncFulfilledRefundRequest = async (
  booking: repo.DashboardBookingRecord,
) => {
  const refundRequest = getActiveRefundRequest(booking);

  if (
    refundRequest === null ||
    getBookingRefundedAmount(booking).lessThanOrEqualTo(0) ||
    getBookingRefundableAmount(booking).greaterThan(0)
  ) {
    return booking;
  }

  const now = new Date();
  await repo.updateRefundRequestById(refundRequest.id, {
    status: BookingRefundRequestStatus.FULFILLED,
    reviewedAt: refundRequest.reviewedAt ?? now,
    fulfilledAt: refundRequest.fulfilledAt ?? now,
  });

  const updatedBooking = await repo.findBookingById(booking.id);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return updatedBooking;
};

export const getBookingBalanceAmount = (booking: repo.DashboardBookingRecord) => {
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    return new Prisma.Decimal(0);
  }

  const netPaidAmount = getBookingPaidAmount(booking).minus(
    getBookingRefundedAmount(booking),
  );
  const folioTotal = booking.folioCharges
    .filter((charge) => charge.status === FolioChargeStatus.ACTIVE)
    .reduce(
      (total, charge) => total.plus(charge.amount),
      new Prisma.Decimal(0),
    );
  const balance = booking.totalAmount.plus(folioTotal).minus(netPaidAmount);
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
};

export const assertBookingCanAcceptPayment = (
  booking: repo.DashboardBookingRecord,
) => {
  if (booking.status === BookingStatus.CANCELLED) {
    throw new HttpError(
      409,
      "BOOKING_CANCELLED",
      "Cancelled bookings cannot accept payments",
    );
  }

  if (booking.status === BookingStatus.NO_SHOW) {
    throw new HttpError(
      409,
      "BOOKING_NO_SHOW",
      "No-show bookings cannot accept payments",
    );
  }

  if (booking.status === BookingStatus.CHECKED_OUT) {
    throw new HttpError(
      409,
      "BOOKING_PAYMENT_CLOSED",
      "Checked-out bookings cannot accept payments",
    );
  }
};

export const getRefundRecordedByUserId = (metadata: Prisma.JsonValue) => {
  if (
    metadata === null ||
    Array.isArray(metadata) ||
    typeof metadata !== "object"
  ) {
    return null;
  }
  const recordedByUserId = metadata.recordedByUserId;
  return typeof recordedByUserId === "string" && recordedByUserId.length > 0
    ? recordedByUserId
    : null;
};

export const getRefundPaymentStatus = (booking: repo.DashboardBookingRecord) => {
  const paidAmount = getBookingPaidAmount(booking);
  const refundedAmount = getBookingRefundedAmount(booking);

  if (paidAmount.greaterThan(0) && refundedAmount.greaterThanOrEqualTo(paidAmount)) {
    return BookingPaymentStatus.REFUNDED;
  }

  if (paidAmount.lessThanOrEqualTo(0)) {
    return BookingPaymentStatus.PENDING;
  }

  if (paidAmount.lessThan(booking.totalAmount)) {
    return BookingPaymentStatus.PARTIALLY_PAID;
  }

  return BookingPaymentStatus.PAID;
};

export const assertRefundProviderAvailable = (
  provider: PaymentProvider,
  method: RecordDashboardBookingRefundInput["method"],
) => {
  if (provider === PaymentProvider.MANUAL) {
    if (method === PaymentMethod.ONLINE_GATEWAY) {
      throw new HttpError(
        422,
        "REFUND_METHOD_MISMATCH",
        "Manual payments must be refunded with a manual refund method",
      );
    }

    return;
  }

  if (method !== PaymentMethod.ONLINE_GATEWAY) {
    throw new HttpError(
      422,
      "REFUND_METHOD_MISMATCH",
      "Gateway payments must be refunded through the original gateway",
    );
  }

  throw new HttpError(
    501,
    "REFUND_PROVIDER_NOT_CONFIGURED",
    "Gateway refund adapter is not configured yet",
  );
};
