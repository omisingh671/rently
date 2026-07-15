import {
  BookingRefundRequestStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./bookings.repository.js";
import {
  activeRefundRequestStatuses,
  getNonRefundableTokenAmount,
  getPaidAmount,
  getRefundedAmount,
} from "./bookings.financials.js";
import { getBookingTaxBreakdown } from "./bookings.tax-breakdown.js";
import { getBookingPolicyDto } from "./bookings.policy.js";

export const getRefundableAmount = async (
  booking: repo.PublicBookingRecord,
  tx?: Prisma.TransactionClient,
) => {
  const policy = await getBookingPolicyDto(booking, tx);
  return Math.max(
    0,
    getPaidAmount(booking) -
      getRefundedAmount(booking) -
      getNonRefundableTokenAmount(booking, policy),
  );
};

export const getMappedRefundableAmount = async (
  booking: repo.PublicBookingRecord,
) => {
  const taxBreakdown = getBookingTaxBreakdown(booking.taxBreakdown);
  const nonRefundableAmount = taxBreakdown
    .filter((tax) => tax.isRefundable === false)
    .reduce((sum, tax) => sum + Number(tax.taxAmount), 0);
  const policy = await getBookingPolicyDto(booking);

  return Math.max(
    0,
    getPaidAmount(booking) -
      getRefundedAmount(booking) -
      nonRefundableAmount -
      getNonRefundableTokenAmount(booking, policy),
  );
};

export const syncFulfilledRefundRequest = async (
  booking: repo.PublicBookingRecord,
) => {
  const refundRequest =
    booking.refundRequests.find((request) =>
      activeRefundRequestStatuses.includes(request.status),
    ) ?? null;

  if (
    refundRequest === null ||
    getRefundedAmount(booking) <= 0 ||
    (await getMappedRefundableAmount(booking)) > 0
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
