import type {
  BookingPolicy,
  BookingPolicyForm,
  BookingPolicyPayload,
  BookingPolicyRules,
} from "./types";

const stringifyRules = (rules: BookingPolicyRules) =>
  JSON.stringify(rules, null, 2);

const parseRules = (label: string, value: string): BookingPolicyRules => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON object`);
    }
    return parsed as BookingPolicyRules;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${label}: ${error.message}`);
    }
    throw new Error(`${label}: Invalid JSON`);
  }
};

export const emptyBookingPolicyForm: BookingPolicyForm = {
  advancePaymentType: "FIXED_AMOUNT",
  advancePaymentValue: "10",
  tokenRefundable: false,
  cancellationRulesText: stringifyRules({
    guestCancellationAllowed: true,
    allowedStatuses: ["PENDING", "CONFIRMED"],
    beforeCheckInOnly: true,
  }),
  refundRulesText: stringifyRules({
    tokenRefundable: false,
    manualReviewRequired: true,
  }),
  earlyCheckoutRulesText: stringifyRules({
    refundUnusedNights: false,
    manualReviewRequired: true,
  }),
  noShowRulesText: stringifyRules({
    markAfterCheckInCutoff: true,
    tokenRefundable: false,
  }),
  guestPolicyText:
    "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.",
};

export const mapPolicyToForm = (policy: BookingPolicy): BookingPolicyForm => ({
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: String(Number(policy.advancePaymentValue)),
  tokenRefundable: policy.tokenRefundable,
  cancellationRulesText: stringifyRules(policy.cancellationRules),
  refundRulesText: stringifyRules(policy.refundRules),
  earlyCheckoutRulesText: stringifyRules(policy.earlyCheckoutRules),
  noShowRulesText: stringifyRules(policy.noShowRules),
  guestPolicyText: policy.guestPolicyText,
});

export const mapFormToPayload = (
  form: BookingPolicyForm,
): BookingPolicyPayload => ({
  advancePaymentType: form.advancePaymentType,
  advancePaymentValue:
    form.advancePaymentType === "NONE"
      ? 0
      : Number(form.advancePaymentValue || 0),
  tokenRefundable: form.tokenRefundable,
  cancellationRules: parseRules("Cancellation rules", form.cancellationRulesText),
  refundRules: parseRules("Refund rules", form.refundRulesText),
  earlyCheckoutRules: parseRules(
    "Early checkout rules",
    form.earlyCheckoutRulesText,
  ),
  noShowRules: parseRules("No-show rules", form.noShowRulesText),
  guestPolicyText: form.guestPolicyText.trim(),
});
