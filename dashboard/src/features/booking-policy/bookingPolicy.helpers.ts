import type {
  BookingPolicy,
  BookingPolicyForm,
  BookingPolicyPayload,
  BookingPolicyRules,
} from "./types";

const defaultGuestPolicyText =
  "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.";

const pickBoolean = (
  rules: BookingPolicyRules,
  key: string,
  fallback: boolean,
) => (typeof rules[key] === "boolean" ? rules[key] : fallback);

export const emptyBookingPolicyForm: BookingPolicyForm = {
  advancePaymentType: "FIXED_AMOUNT",
  advancePaymentValue: "10",
  tokenRefundable: false,
  checkInTime: "12:00",
  checkOutTime: "11:00",
  pendingPaymentExpiryMinutes: "15",
  guestCancellationAllowed: true,
  earlyCheckInEnabled: true,
  earlyCheckInFeeType: "NONE",
  earlyCheckInFeeValue: "0",
  refundUnusedNights: false,
  earlyCheckoutRefundPercentage: "100",
  earlyCheckoutManualReviewRequired: true,
  lateCheckoutFeeType: "NIGHTLY_RATE_MULTIPLIER",
  lateCheckoutFeeValue: "1",
  lateCheckoutGraceMinutes: "0",
  downgradeFinancialTreatment: "NO_CREDIT",
  noShowAfterTime: "20:00",
  guestPolicyText: defaultGuestPolicyText,
};

export const mapPolicyToForm = (policy: BookingPolicy): BookingPolicyForm => ({
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: String(Number(policy.advancePaymentValue)),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  pendingPaymentExpiryMinutes: String(policy.pendingPaymentExpiryMinutes),
  guestCancellationAllowed: pickBoolean(
    policy.cancellationRules,
    "guestCancellationAllowed",
    true,
  ),
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
  noShowAfterTime:
    typeof policy.noShowRules.noShowAfterTime === "string"
      ? policy.noShowRules.noShowAfterTime
      : "20:00",
  guestPolicyText: policy.guestPolicyText,
});

export const mapFormToPayload = (
  form: BookingPolicyForm,
  expectedVersion: number,
): BookingPolicyPayload => ({
  expectedVersion,
  advancePaymentType: form.advancePaymentType,
  advancePaymentValue:
    form.advancePaymentType === "NONE"
      ? 0
      : Number(form.advancePaymentValue || 0),
  tokenRefundable: form.tokenRefundable,
  checkInTime: form.checkInTime,
  checkOutTime: form.checkOutTime,
  pendingPaymentExpiryMinutes: Number(form.pendingPaymentExpiryMinutes),
  cancellationRules: {
    guestCancellationAllowed: form.guestCancellationAllowed,
  },
  refundRules: {
    manualReviewRequired: true,
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
    noShowAfterTime: form.noShowAfterTime,
  },
  guestPolicyText: form.guestPolicyText.trim(),
});

export const validateBookingPolicyForm = (form: BookingPolicyForm) => {
  const errors: Partial<Record<keyof BookingPolicyForm, string>> = {};
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timePattern.test(form.checkInTime)) errors.checkInTime = "Enter a valid check-in time.";
  if (!timePattern.test(form.checkOutTime)) errors.checkOutTime = "Enter a valid check-out time.";
  if (!timePattern.test(form.noShowAfterTime)) errors.noShowAfterTime = "Enter a valid no-show cutoff.";

  const advance = Number(form.advancePaymentValue);
  if (
    form.advancePaymentType !== "NONE" &&
    (!Number.isFinite(advance) || advance <= 0 ||
      (form.advancePaymentType === "PERCENTAGE" && advance > 100))
  ) {
    errors.advancePaymentValue = "Enter a positive amount, or a percentage up to 100.";
  }
  const expiry = Number(form.pendingPaymentExpiryMinutes);
  if (!Number.isInteger(expiry) || expiry < 5 || expiry > 120) {
    errors.pendingPaymentExpiryMinutes = "Use a whole number from 5 to 120 minutes.";
  }
  const earlyFee = Number(form.earlyCheckInFeeValue);
  if (form.earlyCheckInFeeType === "FIXED_AMOUNT" && (!Number.isFinite(earlyFee) || earlyFee < 0)) {
    errors.earlyCheckInFeeValue = "Enter a valid non-negative fee.";
  }
  const refundPercentage = Number(form.earlyCheckoutRefundPercentage);
  if (!Number.isFinite(refundPercentage) || refundPercentage < 0 || refundPercentage > 100) {
    errors.earlyCheckoutRefundPercentage = "Use a percentage from 0 to 100.";
  }
  const lateFee = Number(form.lateCheckoutFeeValue);
  if (!Number.isFinite(lateFee) || lateFee < 0) {
    errors.lateCheckoutFeeValue = "Enter a valid non-negative fee.";
  }
  const grace = Number(form.lateCheckoutGraceMinutes);
  if (!Number.isInteger(grace) || grace < 0 || grace > 1440) {
    errors.lateCheckoutGraceMinutes = "Use a whole number from 0 to 1440.";
  }
  if (!form.guestPolicyText.trim()) errors.guestPolicyText = "Guest policy text is required.";
  return errors;
};
