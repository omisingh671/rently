import type { Booking } from "./types";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export const getCancellationRefundLabel = (booking: Booking) => {
  if (booking.paidAmount <= 0) {
    return "No payment made";
  }

  if (booking.refundRequest?.status === "REQUESTED") {
    return "Refund request pending";
  }

  if (booking.refundRequest?.status === "IN_REVIEW") {
    return "Refund in review";
  }

  if (booking.refundRequest?.status === "FULFILLED") {
    return `Refunded ${formatPrice(booking.refundedAmount)}`;
  }

  if (booking.refundRequest?.status === "REJECTED") {
    return "Refund rejected";
  }

  if (booking.refundableAmount > 0) {
    return `Refund pending ${formatPrice(booking.refundableAmount)}`;
  }

  return `Refunded ${formatPrice(booking.refundedAmount)}`;
};
