import type {
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
  Prisma,
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
  metadata?: Prisma.InputJsonObject;
  status?: PaymentStatus;
}
