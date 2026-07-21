import type { BookingStatus, PaymentMethod } from "./types";

export type RiskAction =
  | "assignRoom"
  | "checkIn"
  | "checkOut"
  | "cancel"
  | "noShow"
  | "lifecycleReversal"
  | "recordPayment"
  | "recordRefund"
  | "rejectRefundRequest";

export type PendingAction = {
  type: RiskAction;
  title: string;
  message: string;
  confirmLabel: string;
  status?: BookingStatus;
  requiresNote?: boolean;
};

export const paymentMethods: PaymentMethod[] = [
  "CASH",
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
  "MANUAL",
];

export const refundMethods: PaymentMethod[] = [
  "CASH",
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
  "MANUAL",
  "ONLINE_GATEWAY",
];

export const paymentMethodsRequiringReference = new Set<PaymentMethod>([
  "UPI_MANUAL",
  "BANK_TRANSFER",
  "CARD_POS",
]);

export const getActionDefaults = (action: RiskAction): PendingAction => {
  if (action === "checkIn") {
    return {
      type: action,
      title: "Confirm Check In",
      message:
        "This will mark the guest as checked in and write an audit entry.",
      confirmLabel: "Confirm Check In",
      status: "CHECKED_IN",
    };
  }

  if (action === "checkOut") {
    return {
      type: action,
      title: "Confirm Check Out",
      message: "This will close the active stay and write an audit entry.",
      confirmLabel: "Confirm Check Out",
      status: "CHECKED_OUT",
    };
  }

  if (action === "cancel") {
    return {
      type: action,
      title: "Cancel Booking",
      message: "This will cancel the booking and write an audit entry.",
      confirmLabel: "Cancel Booking",
      status: "CANCELLED",
      requiresNote: true,
    };
  }

  if (action === "noShow") {
    return {
      type: action,
      title: "Mark No-Show",
      message:
        "This will mark the guest as no-show and close normal check-in actions.",
      confirmLabel: "Mark No-Show",
      status: "NO_SHOW",
      requiresNote: true,
    };
  }

  if (action === "lifecycleReversal") {
    return {
      type: action,
      title: "Reverse Last Lifecycle Action",
      message:
        "This reverses only the current check-in, check-out, or no-show state. Financial and housekeeping conflicts will block the reversal.",
      confirmLabel: "Confirm Reversal",
      requiresNote: true,
    };
  }

  if (action === "recordPayment") {
    return {
      type: action,
      title: "Record Balance Payment",
      message:
        "This will add a successful balance payment and update the booking payment status.",
      confirmLabel: "Record Payment",
    };
  }

  if (action === "recordRefund") {
    return {
      type: action,
      title: "Record Refund",
      message:
        "This records returned money against the selected original payment. Manual refunds must already be returned outside the system.",
      confirmLabel: "Record Refund",
      requiresNote: true,
    };
  }

  if (action === "rejectRefundRequest") {
    return {
      type: action,
      title: "Reject Refund Request",
      message:
        "This closes the guest refund request without recording returned money. Add a clear admin note for the guest.",
      confirmLabel: "Reject Request",
      requiresNote: true,
    };
  }

  return {
    type: action,
    title: "Change Assigned Room",
    message:
      "This will change the room used for this stay. The backend will reject unavailable rooms.",
    confirmLabel: "Confirm Room Change",
  };
};
