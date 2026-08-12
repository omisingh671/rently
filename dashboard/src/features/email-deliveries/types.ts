export type EmailDeliveryStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "DEAD_LETTER";

export type EmailDeliveryJob = {
  id: string;
  type: "PASSWORD_RESET";
  status: EmailDeliveryStatus;
  userId: string;
  recipient: string;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  correlationId: string | null;
  nextAttemptAt: string | null;
  deadLetteredAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
