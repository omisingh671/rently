import {
  BookingPaymentStatus,
  BookingStatus,
  BookingType,
} from "@/generated/prisma/client.js";
import type { PublicBookingDTO } from "./bookings.dto.js";
import type * as repo from "./bookings.repository.js";
import {
  activeRefundRequestStatuses,
  getNonRefundableTokenAmount,
  getPaidAmount,
  getRefundedAmount,
  getTokenPaidAmount,
  getTokenPaymentStatus,
} from "./bookings.financials.js";
import { mapBookingItems } from "./bookings.mapping.js";
import { getBookingPolicyDto } from "./bookings.policy.js";
import { getBookingTaxBreakdown } from "./bookings.tax-breakdown.js";

export const mapBooking = async (
  booking: repo.PublicBookingRecord,
): Promise<PublicBookingDTO> => {
  const items = mapBookingItems(booking.items);
  const title =
    booking.bookingType === BookingType.MULTI_ROOM
      ? booking.targetLabel
      : `${booking.productName} - ${booking.targetLabel}`;
  const paidAmount = getPaidAmount(booking);
  const refundedAmount = getRefundedAmount(booking);
  const taxBreakdown = getBookingTaxBreakdown(booking.taxBreakdown);
  const nonRefundableAmount = taxBreakdown
    .filter((tax) => tax.isRefundable === false)
    .reduce((sum, tax) => sum + Number(tax.taxAmount), 0);
  const policy = await getBookingPolicyDto(booking);
  const nonRefundableTokenAmount = getNonRefundableTokenAmount(booking, policy);
  const tokenPaidAmount = getTokenPaidAmount(booking);

  const netPaidAmount = Math.max(0, paidAmount - refundedAmount);
  const refundableAmount = Math.max(
    0,
    paidAmount - refundedAmount - nonRefundableAmount - nonRefundableTokenAmount,
  );
  const balanceAmount =
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NO_SHOW
      ? 0
      : Math.max(0, Number(booking.totalAmount) - netPaidAmount);
  const taxableAmount = Number(booking.taxableAmount);
  const refundRequest =
    booking.refundRequests.find((request) =>
      activeRefundRequestStatuses.includes(request.status),
    ) ??
    booking.refundRequests[0] ??
    null;
  const paymentStatus =
    paidAmount <= 0
      ? BookingPaymentStatus.PENDING
      : refundedAmount >= paidAmount
        ? BookingPaymentStatus.REFUNDED
        : paidAmount < Number(booking.totalAmount)
          ? BookingPaymentStatus.PARTIALLY_PAID
          : BookingPaymentStatus.PAID;

  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    userId: booking.userId,
    spaceId: booking.roomId ?? booking.unitId ?? booking.productId ?? booking.id,
    propertyId: booking.propertyId,
    bookingType: booking.bookingType,
    guestCount: booking.guestCount,
    comfortOption: booking.comfortOption,
    title,
    spaceName: booking.targetLabel,
    status: booking.status,
    paymentPolicy: booking.paymentPolicy,
    paymentStatus,
    upfrontAmount: Number(booking.upfrontAmount),
    tokenPaidAmount,
    tokenPaymentStatus: getTokenPaymentStatus(booking, tokenPaidAmount),
    paymentExpiresAt: booking.paymentExpiresAt?.toISOString() ?? null,
    guestName: booking.guestNameSnapshot,
    guestEmail: booking.guestEmailSnapshot,
    guestContactNumber: booking.guestContactSnapshot ?? null,
    from: booking.checkIn.toISOString(),
    to: booking.checkOut.toISOString(),
    pricePerNight: Number(booking.pricePerNight),
    subtotalAmount: Number(booking.subtotalAmount),
    totalPrice: Number(booking.totalAmount),
    discountAmount: Number(booking.discountAmount),
    taxableAmount,
    taxAmount: Number(booking.taxAmount),
    taxBreakdown,
    paidAmount,
    refundedAmount,
    netPaidAmount,
    refundableAmount,
    balanceAmount,
    remainingPayAtCheckIn: Math.max(
      0,
      balanceAmount -
        (booking.status === BookingStatus.PENDING
          ? Number(booking.upfrontAmount)
          : 0),
    ),
    policy,
    items,
    internalNotes: booking.internalNotes ?? null,
    cancellationReason: booking.cancellationReason ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    couponCode: booking.coupon?.code ?? null,
    refundRequest:
      refundRequest === null
        ? null
        : {
            id: refundRequest.id,
            status: refundRequest.status,
            reason: refundRequest.reason,
            adminNote: refundRequest.adminNote ?? null,
            reviewedAt: refundRequest.reviewedAt?.toISOString() ?? null,
            fulfilledAt: refundRequest.fulfilledAt?.toISOString() ?? null,
            createdAt: refundRequest.createdAt.toISOString(),
          },
    createdAt: booking.createdAt.toISOString(),
  };
};
