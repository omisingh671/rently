import { z } from "zod";

const idSchema = z.string().min(1, "ID is required");

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

const bookingPolicyRulesSchema = z.record(z.string(), z.unknown());
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
  earlyCheckoutRules: bookingPolicyRulesSchema,
  noShowRules: bookingPolicyRulesSchema,
  guestPolicyText: z.string().trim().min(1).max(5000),
});
