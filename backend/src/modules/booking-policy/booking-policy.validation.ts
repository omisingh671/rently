import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

const overrideRoleSchema = z.literal("ADMIN");
const cancellationRulesSchema = z
  .object({
    guestCancellationAllowed: z.boolean(),
  })
  .strict();
const refundRulesSchema = z
  .object({
    manualReviewRequired: z.literal(true),
  })
  .strict();
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
const noShowRulesSchema = z
  .object({
    noShowAfterTime: bookingPolicyTimeSchema,
  })
  .strict();

export const updateBookingPolicySchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    advancePaymentType: z.enum(["NONE", "FIXED_AMOUNT", "PERCENTAGE"]),
    advancePaymentValue: z.number().finite().nonnegative(),
    tokenRefundable: z.boolean(),
    checkInTime: bookingPolicyTimeSchema,
    checkOutTime: bookingPolicyTimeSchema,
    pendingPaymentExpiryMinutes: z.number().int().min(5).max(120),
    cancellationRules: cancellationRulesSchema,
    refundRules: refundRulesSchema,
    earlyCheckInRules: earlyCheckInRulesSchema,
    earlyCheckoutRules: earlyCheckoutRulesSchema,
    lateCheckoutRules: lateCheckoutRulesSchema,
    downgradeRules: downgradeRulesSchema,
    noShowRules: noShowRulesSchema,
    guestPolicyText: z.string().trim().min(1).max(5000),
  })
  .strict()
  .superRefine((policy, ctx) => {
    if (policy.advancePaymentType === "NONE" && policy.advancePaymentValue !== 0) {
      ctx.addIssue({
        code: "custom",
        path: ["advancePaymentValue"],
        message: "Advance payment value must be zero when no upfront payment is required",
      });
    }
    if (policy.advancePaymentType !== "NONE" && policy.advancePaymentValue <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["advancePaymentValue"],
        message: "Advance payment value must be greater than zero",
      });
    }
    if (policy.advancePaymentType === "PERCENTAGE" && policy.advancePaymentValue > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["advancePaymentValue"],
        message: "Advance payment percentage cannot exceed 100",
      });
    }
    const scaledAdvanceValue = policy.advancePaymentValue * 100;
    if (Math.abs(scaledAdvanceValue - Math.round(scaledAdvanceValue)) > 1e-8) {
      ctx.addIssue({
        code: "custom",
        path: ["advancePaymentValue"],
        message: "Advance payment value can have at most two decimal places",
      });
    }
  });
