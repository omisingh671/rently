import { z } from "zod";
import { PaymentPurpose } from "@/generated/prisma/client.js";

export const createManualPaymentSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  amount: z.coerce.number().positive().optional(),
  purpose: z.nativeEnum(PaymentPurpose).optional(),
});
