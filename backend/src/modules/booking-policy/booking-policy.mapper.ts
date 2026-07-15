import type { PropertyBookingPolicy } from "@/generated/prisma/client.js";
import type { DashboardBookingPolicyDTO } from "./booking-policy.dto.js";

const asPolicyRuleObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const mapBookingPolicy = (
  policy: PropertyBookingPolicy,
): DashboardBookingPolicyDTO => ({
  id: policy.id,
  propertyId: policy.propertyId,
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: policy.advancePaymentValue.toString(),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  cancellationRules: asPolicyRuleObject(policy.cancellationRules),
  refundRules: asPolicyRuleObject(policy.refundRules),
  earlyCheckInRules: asPolicyRuleObject(policy.earlyCheckInRules),
  earlyCheckoutRules: asPolicyRuleObject(policy.earlyCheckoutRules),
  lateCheckoutRules: asPolicyRuleObject(policy.lateCheckoutRules),
  downgradeRules: asPolicyRuleObject(policy.downgradeRules),
  noShowRules: asPolicyRuleObject(policy.noShowRules),
  guestPolicyText: policy.guestPolicyText,
  createdAt: policy.createdAt,
  updatedAt: policy.updatedAt,
});
