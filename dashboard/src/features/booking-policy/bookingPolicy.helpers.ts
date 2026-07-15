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
  "refundPercentage",
  "manualReviewRequired",
  "overrideRole",
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
  earlyCheckInEnabled: true,
  earlyCheckInFeeType: "NONE",
  earlyCheckInFeeValue: "0",
  refundUnusedNights: false,
  earlyCheckoutRefundPercentage: "100",
  earlyCheckoutManualReviewRequired: true,
  earlyCheckoutRulesExtra: {},
  lateCheckoutFeeType: "NIGHTLY_RATE_MULTIPLIER",
  lateCheckoutFeeValue: "1",
  lateCheckoutGraceMinutes: "0",
  downgradeFinancialTreatment: "NO_CREDIT",
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
  earlyCheckInEnabled: pickBoolean(policy.earlyCheckInRules, "enabled", true),
  earlyCheckInFeeType:
    policy.earlyCheckInRules.feeType === "FIXED_AMOUNT"
      ? "FIXED_AMOUNT"
      : "NONE",
  earlyCheckInFeeValue: String(Number(policy.earlyCheckInRules.feeValue ?? 0)),
  refundUnusedNights: pickBoolean(
    policy.earlyCheckoutRules,
    "refundUnusedNights",
    false,
  ),
  earlyCheckoutRefundPercentage: String(
    Number(policy.earlyCheckoutRules.refundPercentage ?? 100),
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
  lateCheckoutFeeType:
    policy.lateCheckoutRules.feeType === "FIXED_AMOUNT"
      ? "FIXED_AMOUNT"
      : "NIGHTLY_RATE_MULTIPLIER",
  lateCheckoutFeeValue: String(Number(policy.lateCheckoutRules.feeValue ?? 1)),
  lateCheckoutGraceMinutes: String(
    Number(policy.lateCheckoutRules.graceMinutes ?? 0),
  ),
  downgradeFinancialTreatment:
    policy.downgradeRules.financialTreatment === "CREDIT_DIFFERENCE" ||
    policy.downgradeRules.financialTreatment === "WAIVER"
      ? policy.downgradeRules.financialTreatment
      : "NO_CREDIT",
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
  earlyCheckInRules: {
    enabled: form.earlyCheckInEnabled,
    feeType: form.earlyCheckInFeeType,
    feeValue:
      form.earlyCheckInFeeType === "NONE"
        ? 0
        : Number(form.earlyCheckInFeeValue || 0),
    overrideRole: "ADMIN",
  },
  earlyCheckoutRules: {
    ...form.earlyCheckoutRulesExtra,
    refundUnusedNights: form.refundUnusedNights,
    refundPercentage: Number(form.earlyCheckoutRefundPercentage || 0),
    manualReviewRequired: form.earlyCheckoutManualReviewRequired,
    overrideRole: "ADMIN",
  },
  lateCheckoutRules: {
    feeType: form.lateCheckoutFeeType,
    feeValue: Number(form.lateCheckoutFeeValue || 0),
    graceMinutes: Number(form.lateCheckoutGraceMinutes || 0),
    overrideRole: "ADMIN",
  },
  downgradeRules: {
    financialTreatment: form.downgradeFinancialTreatment,
    overrideRole: "ADMIN",
  },
  noShowRules: {
    ...form.noShowRulesExtra,
    markAfterCheckInCutoff: form.markAfterCheckInCutoff,
    tokenRefundable: form.noShowTokenRefundable,
  },
  guestPolicyText: form.guestPolicyText.trim(),
});
