export interface CreateManualPaymentInput {
  userId: string;
  bookingId: string;
  idempotencyKey: string;
}
