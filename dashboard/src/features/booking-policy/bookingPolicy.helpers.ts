import type {
  BookingPolicy,
  BookingPolicyForm,
  BookingPolicyPayload,
  BookingPolicyRules,
  BookingStatusRule,
} from "./types";

const knownCancellationRuleKeys = new Set([
  "guestCancellationAllowed",
  "allowedStatuses",
  "beforeCheckInOnly",
]);

const knownRefundRuleKeys = new Set(["tokenRefundable", "manualReviewRequired"]);

const knownEarlyCheckoutRuleKeys = new Set([
  "refundUnusedNights",
  "manualReviewRequired",
]);

const knownNoShowRuleKeys = new Set([
  "markAfterCheckInCutoff",
  "tokenRefundable",
]);

const defaultGuestPolicyText =
  "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.";

const pickBoolean = (
  rules: BookingPolicyRules,
  key: string,
  fallback: boolean,
) => (typeof rules[key] === "boolean" ? rules[key] : fallback);

const isBookingStatusRule = (value: unknown): value is BookingStatusRule =>
  value === "PENDING" || value === "CONFIRMED";

const pickAllowedStatuses = (
  rules: BookingPolicyRules,
): BookingStatusRule[] => {
  const value = rules.allowedStatuses;
  if (!Array.isArray(value)) {
    return ["PENDING", "CONFIRMED"];
  }

  const statuses = value.filter(isBookingStatusRule);
  return statuses.length > 0 ? statuses : ["PENDING", "CONFIRMED"];
};

const omitKnownRules = (
  rules: BookingPolicyRules,
  knownKeys: Set<string>,
): BookingPolicyRules =>
  Object.fromEntries(
    Object.entries(rules).filter(([key]) => !knownKeys.has(key)),
  );

export const emptyBookingPolicyForm: BookingPolicyForm = {
  advancePaymentType: "FIXED_AMOUNT",
  advancePaymentValue: "10",
  tokenRefundable: false,
  checkInTime: "12:00",
  checkOutTime: "11:00",
  guestCancellationAllowed: true,
  allowedStatuses: ["PENDING", "CONFIRMED"],
  beforeCheckInOnly: true,
  cancellationRulesExtra: {},
  refundTokenRefundable: false,
  refundManualReviewRequired: true,
  refundRulesExtra: {},
  refundUnusedNights: false,
  earlyCheckoutManualReviewRequired: true,
  earlyCheckoutRulesExtra: {},
  markAfterCheckInCutoff: true,
  noShowTokenRefundable: false,
  noShowRulesExtra: {},
  guestPolicyText: defaultGuestPolicyText,
};

export const mapPolicyToForm = (policy: BookingPolicy): BookingPolicyForm => ({
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: String(Number(policy.advancePaymentValue)),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  guestCancellationAllowed: pickBoolean(
    policy.cancellationRules,
    "guestCancellationAllowed",
    true,
  ),
  allowedStatuses: pickAllowedStatuses(policy.cancellationRules),
  beforeCheckInOnly: pickBoolean(
    policy.cancellationRules,
    "beforeCheckInOnly",
    true,
  ),
  cancellationRulesExtra: omitKnownRules(
    policy.cancellationRules,
    knownCancellationRuleKeys,
  ),
  refundTokenRefundable: pickBoolean(
    policy.refundRules,
    "tokenRefundable",
    false,
  ),
  refundManualReviewRequired: pickBoolean(
    policy.refundRules,
    "manualReviewRequired",
    true,
  ),
  refundRulesExtra: omitKnownRules(policy.refundRules, knownRefundRuleKeys),
  refundUnusedNights: pickBoolean(
    policy.earlyCheckoutRules,
    "refundUnusedNights",
    false,
  ),
  earlyCheckoutManualReviewRequired: pickBoolean(
    policy.earlyCheckoutRules,
    "manualReviewRequired",
    true,
  ),
  earlyCheckoutRulesExtra: omitKnownRules(
    policy.earlyCheckoutRules,
    knownEarlyCheckoutRuleKeys,
  ),
  markAfterCheckInCutoff: pickBoolean(
    policy.noShowRules,
    "markAfterCheckInCutoff",
    true,
  ),
  noShowTokenRefundable: pickBoolean(
    policy.noShowRules,
    "tokenRefundable",
    false,
  ),
  noShowRulesExtra: omitKnownRules(policy.noShowRules, knownNoShowRuleKeys),
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
  checkInTime: form.checkInTime,
  checkOutTime: form.checkOutTime,
  cancellationRules: {
    ...form.cancellationRulesExtra,
    guestCancellationAllowed: form.guestCancellationAllowed,
    allowedStatuses: form.allowedStatuses,
    beforeCheckInOnly: form.beforeCheckInOnly,
  },
  refundRules: {
    ...form.refundRulesExtra,
    tokenRefundable: form.refundTokenRefundable,
    manualReviewRequired: form.refundManualReviewRequired,
  },
  earlyCheckoutRules: {
    ...form.earlyCheckoutRulesExtra,
    refundUnusedNights: form.refundUnusedNights,
    manualReviewRequired: form.earlyCheckoutManualReviewRequired,
  },
  noShowRules: {
    ...form.noShowRulesExtra,
    markAfterCheckInCutoff: form.markAfterCheckInCutoff,
    tokenRefundable: form.noShowTokenRefundable,
  },
  guestPolicyText: form.guestPolicyText.trim(),
});
