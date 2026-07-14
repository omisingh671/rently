import { z } from "zod";
import { PaymentPurpose, PaymentStatus } from "@/generated/prisma/client.js";

export const createManualPaymentSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  checkoutToken: z.string().uuid().optional(),
  amount: z.coerce.number().positive().optional(),
  purpose: z.nativeEnum(PaymentPurpose).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
});
