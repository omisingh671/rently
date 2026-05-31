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
  earlyCheckoutRules: BookingPolicyRules;
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
  earlyCheckoutRules: BookingPolicyRules;
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
  refundUnusedNights: boolean;
  earlyCheckoutManualReviewRequired: boolean;
  earlyCheckoutRulesExtra: BookingPolicyRules;
  markAfterCheckInCutoff: boolean;
  noShowTokenRefundable: boolean;
  noShowRulesExtra: BookingPolicyRules;
  guestPolicyText: string;
};
