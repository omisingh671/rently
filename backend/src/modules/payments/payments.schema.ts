import { z } from "zod";
import { PaymentPurpose, PaymentStatus } from "@/generated/prisma/client.js";

export const createManualPaymentSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  checkoutToken: z.string().uuid().optional(),
  amount: z.coerce.number().positive().optional(),
  purpose: z.nativeEnum(PaymentPurpose).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
});

export const createGatewayPaymentIntentSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  checkoutToken: z.string().uuid().optional(),
  amount: z.coerce.number().positive().optional(),
  purpose: z.nativeEnum(PaymentPurpose).optional(),
});

export const verifyGatewayPaymentSchema = z.object({
  checkoutToken: z.string().uuid().optional(),
  providerOrderId: z.string().trim().min(1).max(191),
  providerPaymentId: z.string().trim().min(1).max(191).optional(),
  providerSignature: z.string().trim().min(1).max(512).optional(),
});

export const completeMockPaymentSchema = z.object({
  checkoutToken: z.string().uuid().optional(),
  outcome: z.enum(["SUCCEEDED", "FAILED"]).default("SUCCEEDED"),
});
