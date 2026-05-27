export type AdvancePaymentType = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";

export type BookingPolicyRules = Record<string, unknown>;

export type BookingPolicy = {
  id: string;
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
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
  cancellationRules: BookingPolicyRules;
  refundRules: BookingPolicyRules;
  earlyCheckoutRules: BookingPolicyRules;
  noShowRules: BookingPolicyRules;
  guestPolicyText: string;
};

export type BookingPolicyForm = {
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  cancellationRulesText: string;
  refundRulesText: string;
  earlyCheckoutRulesText: string;
  noShowRulesText: string;
  guestPolicyText: string;
};
