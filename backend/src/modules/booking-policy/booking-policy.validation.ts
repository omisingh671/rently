import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

const bookingPolicyRulesSchema = z.record(z.string(), z.unknown());
const overrideRoleSchema = z.literal("ADMIN");
const earlyCheckInRulesSchema = z
  .object({
    enabled: z.boolean(),
    feeType: z.enum(["NONE", "FIXED_AMOUNT"]),
    feeValue: z.number().nonnegative(),
    overrideRole: overrideRoleSchema,
  })
  .refine((rules) => rules.feeType !== "NONE" || rules.feeValue === 0, {
    message: "Fee value must be zero when early check-in fee type is NONE",
  });
const earlyCheckoutRulesSchema = z.object({
  refundUnusedNights: z.boolean(),
  refundPercentage: z.number().min(0).max(100),
  manualReviewRequired: z.boolean(),
  overrideRole: overrideRoleSchema,
});
const lateCheckoutRulesSchema = z.object({
  feeType: z.enum(["NIGHTLY_RATE_MULTIPLIER", "FIXED_AMOUNT"]),
  feeValue: z.number().nonnegative(),
  graceMinutes: z.number().int().min(0).max(1440),
  overrideRole: overrideRoleSchema,
});
const downgradeRulesSchema = z.object({
  financialTreatment: z.enum(["NO_CREDIT", "CREDIT_DIFFERENCE", "WAIVER"]),
  overrideRole: overrideRoleSchema,
});
const bookingPolicyTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:mm 24-hour format");

export const updateBookingPolicySchema = z.object({
  advancePaymentType: z.enum(["NONE", "FIXED_AMOUNT", "PERCENTAGE"]),
  advancePaymentValue: z.number().nonnegative(),
  tokenRefundable: z.boolean(),
  checkInTime: bookingPolicyTimeSchema,
  checkOutTime: bookingPolicyTimeSchema,
  cancellationRules: bookingPolicyRulesSchema,
  refundRules: bookingPolicyRulesSchema,
  earlyCheckInRules: earlyCheckInRulesSchema,
  earlyCheckoutRules: earlyCheckoutRulesSchema,
  lateCheckoutRules: lateCheckoutRulesSchema,
  downgradeRules: downgradeRulesSchema,
  noShowRules: bookingPolicyRulesSchema,
  guestPolicyText: z.string().trim().min(1).max(5000),
});
