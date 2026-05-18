import { z } from "zod";

export const createManualPaymentSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  amount: z.coerce.number().positive().optional(),
});
