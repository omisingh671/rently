import {
  BookingPaymentPolicy,
  BookingRefundRequestStatus,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
} from "@/generated/prisma/client.js";
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";
import type * as repo from "./bookings.repository.js";

export const getNonRefundableTokenAmount = (
  booking: repo.PublicBookingRecord,
  policy: PublicBookingPolicyDTO,
) =>
  policy.tokenRefundable
    ? 0
    : booking.payments
        .filter(
          (payment) =>
            payment.status === PaymentStatus.SUCCEEDED &&
            payment.purpose === PaymentPurpose.TOKEN,
        )
        .reduce((total, payment) => total + Number(payment.amount), 0);

export const getTokenPaidAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments
    .filter(
      (payment) =>
        payment.status === PaymentStatus.SUCCEEDED &&
        payment.purpose === PaymentPurpose.TOKEN,
    )
    .reduce((total, payment) => total + Number(payment.amount), 0);

export const getTokenPaymentStatus = (
  booking: repo.PublicBookingRecord,
  tokenPaidAmount: number,
) => {
  if (
    booking.paymentPolicy !== BookingPaymentPolicy.TOKEN_AT_BOOKING ||
    Number(booking.upfrontAmount) <= 0
  ) {
    return "NOT_REQUIRED" as const;
  }

  return tokenPaidAmount >= Number(booking.upfrontAmount)
    ? "PAID" as const
    : "UNPAID" as const;
};

export const getPaidAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((total, payment) => total + Number(payment.amount), 0);

export const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] =
  [BookingRefundRequestStatus.REQUESTED, BookingRefundRequestStatus.IN_REVIEW];

export const getRefundedAmount = (booking: repo.PublicBookingRecord) =>
  booking.payments.reduce(
    (total, payment) =>
      total +
      payment.refunds
        .filter(
          (refund) =>
            refund.status === PaymentRefundStatus.PENDING ||
            refund.status === PaymentRefundStatus.SUCCEEDED,
        )
        .reduce((refundTotal, refund) => refundTotal + Number(refund.amount), 0),
    0,
  );
