export type EmailDeliveryStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED";

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
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
