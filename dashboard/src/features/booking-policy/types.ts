export type AdvancePaymentType = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";

export type BookingPolicyRules = Record<string, unknown>;

export type BookingPolicy = {
  id: string;
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
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
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  cancellationRules: BookingPolicyRules;
  refundRules: BookingPolicyRules;
  earlyCheckInRules: BookingPolicyRules;
  earlyCheckoutRules: BookingPolicyRules;
  lateCheckoutRules: BookingPolicyRules;
  downgradeRules: BookingPolicyRules;
  noShowRules: BookingPolicyRules;
  guestPolicyText: string;
};

export type BookingStatusRule = "PENDING" | "CONFIRMED";

export type BookingPolicyForm = {
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  guestCancellationAllowed: boolean;
  allowedStatuses: BookingStatusRule[];
  beforeCheckInOnly: boolean;
  cancellationRulesExtra: BookingPolicyRules;
  refundTokenRefundable: boolean;
  refundManualReviewRequired: boolean;
  refundRulesExtra: BookingPolicyRules;
  earlyCheckInEnabled: boolean;
  earlyCheckInFeeType: "NONE" | "FIXED_AMOUNT";
  earlyCheckInFeeValue: string;
  refundUnusedNights: boolean;
  earlyCheckoutRefundPercentage: string;
  earlyCheckoutManualReviewRequired: boolean;
  earlyCheckoutRulesExtra: BookingPolicyRules;
  lateCheckoutFeeType: "NIGHTLY_RATE_MULTIPLIER" | "FIXED_AMOUNT";
  lateCheckoutFeeValue: string;
  lateCheckoutGraceMinutes: string;
  downgradeFinancialTreatment: "NO_CREDIT" | "CREDIT_DIFFERENCE" | "WAIVER";
  markAfterCheckInCutoff: boolean;
  noShowTokenRefundable: boolean;
  noShowRulesExtra: BookingPolicyRules;
  guestPolicyText: string;
};
