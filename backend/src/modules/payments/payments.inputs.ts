import type {
  PaymentMethod,
  PaymentPurpose,
} from "@/generated/prisma/client.js";

export interface CreateManualPaymentInput {
  userId?: string;
  actorUserId?: string;
  bookingId: string;
  idempotencyKey: string;
  amount?: number;
  purpose?: PaymentPurpose;
  method?: PaymentMethod;
  note?: string;
  paidAt?: Date;
}
