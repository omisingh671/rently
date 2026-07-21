export type AdvancePaymentType = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";

export type BookingPolicyRules = Record<string, unknown>;

export type BookingPolicy = {
  id: string;
  propertyId: string;
  version: number;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: BookingPolicyRules;
  refundRules: BookingPolicyRules;
  earlyCheckInRules: BookingPolicyRules;
  earlyCheckoutRules: BookingPolicyRules;
  lateCheckoutRules: BookingPolicyRules;
  downgradeRules: BookingPolicyRules;
  noShowRules: BookingPolicyRules;
  guestPolicyText: string;
  createdAt: string;
  updatedAt: string;
};

export type BookingPolicyPayload = {
  expectedVersion: number;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: BookingPolicyRules;
  refundRules: BookingPolicyRules;
  earlyCheckInRules: BookingPolicyRules;
  earlyCheckoutRules: BookingPolicyRules;
  lateCheckoutRules: BookingPolicyRules;
  downgradeRules: BookingPolicyRules;
  noShowRules: BookingPolicyRules;
  guestPolicyText: string;
};

export type BookingPolicyForm = {
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: string;
  guestCancellationAllowed: boolean;
  earlyCheckInEnabled: boolean;
  earlyCheckInFeeType: "NONE" | "FIXED_AMOUNT";
  earlyCheckInFeeValue: string;
  refundUnusedNights: boolean;
  earlyCheckoutRefundPercentage: string;
  earlyCheckoutManualReviewRequired: boolean;
  lateCheckoutFeeType: "NIGHTLY_RATE_MULTIPLIER" | "FIXED_AMOUNT";
  lateCheckoutFeeValue: string;
  lateCheckoutGraceMinutes: string;
  downgradeFinancialTreatment: "NO_CREDIT" | "CREDIT_DIFFERENCE" | "WAIVER";
  noShowAfterTime: string;
  guestPolicyText: string;
};

export type BookingPolicyAudit = {
  id: string;
  propertyId: string;
  version: number;
  actor: { id: string; fullName: string; email: string };
  previousData: BookingPolicyRules;
  nextData: BookingPolicyRules;
  createdAt: string;
};
