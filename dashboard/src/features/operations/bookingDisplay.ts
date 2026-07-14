import { formatEnumLabel } from "@/utils/formatEnumLabel";
import type { AdminBooking, PaymentMethod, PaymentPurpose } from "./types";

export const getPaymentMethodLabel = (method: PaymentMethod) => {
  if (method === "CARD_POS") return "Card / POS";
  return formatEnumLabel(method);
};

const paymentPurposeLabels: Record<PaymentPurpose, string> = {
  TOKEN: "Booking token / advance",
  BALANCE: "Balance due payment",
  FULL_PAYMENT: "Full booking payment",
};

export const getPaymentPurposeLabel = (purpose: PaymentPurpose) =>
  paymentPurposeLabels[purpose];

export const getPaymentReferenceLabel = (method: PaymentMethod) => {
  if (method === "UPI_MANUAL") return "UPI transaction/reference ID";
  if (method === "BANK_TRANSFER") return "Bank UTR/reference number";
  if (method === "CARD_POS") return "POS/card machine transaction ID";
  return "Reference ID";
};

export const getPayerDetailLabel = (method: PaymentMethod) => {
  if (method === "UPI_MANUAL") return "Payer UPI VPA";
  if (method === "BANK_TRANSFER") return "Bank account hint";
  if (method === "CARD_POS") return "Card last 4";
  return "Payer detail";
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const formatMoney = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

export const getStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit stay" : "Room stay";
  }

  return booking.productName;
};

export const getAssignedLabel = (booking: AdminBooking) =>
  booking.items.length > 0
    ? booking.items.map((item) => item.targetLabel).join(" + ")
    : booking.targetLabel;

export const hasAssignedTarget = (booking: AdminBooking) =>
  booking.items.length > 0 &&
  booking.items.every((item) => item.roomId !== null || item.unitId !== null);
