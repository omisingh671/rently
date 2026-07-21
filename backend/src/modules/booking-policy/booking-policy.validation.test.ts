import assert from "node:assert/strict";
import test from "node:test";
import { updateBookingPolicySchema } from "./booking-policy.validation.js";

const validPolicy = {
  expectedVersion: 1,
  advancePaymentType: "FIXED_AMOUNT" as const,
  advancePaymentValue: 10,
  tokenRefundable: false,
  checkInTime: "12:00",
  checkOutTime: "11:00",
  pendingPaymentExpiryMinutes: 15,
  cancellationRules: { guestCancellationAllowed: true },
  refundRules: { manualReviewRequired: true as const },
  earlyCheckInRules: { enabled: true, feeType: "NONE" as const, feeValue: 0, overrideRole: "ADMIN" as const },
  earlyCheckoutRules: { refundUnusedNights: false, refundPercentage: 100, manualReviewRequired: true, overrideRole: "ADMIN" as const },
  lateCheckoutRules: { feeType: "NIGHTLY_RATE_MULTIPLIER" as const, feeValue: 1, graceMinutes: 0, overrideRole: "ADMIN" as const },
  downgradeRules: { financialTreatment: "NO_CREDIT" as const, overrideRole: "ADMIN" as const },
  noShowRules: { noShowAfterTime: "20:00" },
  guestPolicyText: "Property policy",
};

test("accepts a bounded pending-payment expiry", () => {
  assert.equal(
    updateBookingPolicySchema.parse(validPolicy).pendingPaymentExpiryMinutes,
    15,
  );
});

test("rejects an unsafe pending-payment expiry", () => {
  const result = updateBookingPolicySchema.safeParse({
    ...validPolicy,
    pendingPaymentExpiryMinutes: 0,
  });
  assert.equal(result.success, false);
});

test("requires zero advance value when no upfront payment is configured", () => {
  const result = updateBookingPolicySchema.safeParse({
    ...validPolicy,
    advancePaymentType: "NONE",
    advancePaymentValue: 10,
  });
  assert.equal(result.success, false);
});
