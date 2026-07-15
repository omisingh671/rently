export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";
export type NotificationEventKey =
  | "BOOKING_CREATED"
  | "BOOKING_CANCELLED"
  | "PAYMENT_SUCCEEDED"
  | "REFUND_SUCCEEDED"
  | "USER_REGISTERED"
  | "BOOKING_CHECKED_IN"
  | "BOOKING_CHECKED_OUT";
export type NotificationOverrideState = "USE_GLOBAL" | "ENABLED" | "DISABLED";

export type NotificationSettingsResponse = {
  channels: Array<{ key: NotificationChannel; label: string; available: boolean }>;
  events: Array<{
    key: NotificationEventKey;
    label: string;
    propertyScoped: boolean;
    settings: Array<{
      channel: NotificationChannel;
      globalEnabled: boolean;
      overrideState: NotificationOverrideState | null;
      effectiveEnabled: boolean;
    }>;
  }>;
};

export type NotificationAudit = {
  id: string;
  scope: "GLOBAL" | "PROPERTY";
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  previousState: NotificationOverrideState | null;
  nextState: NotificationOverrideState;
  createdAt: string;
  actor: { id: string; fullName: string; email: string };
  property: { id: string; name: string } | null;
};

export type NotificationDelivery = {
  id: string;
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  recipient: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  sentAt: string | null;
  createdAt: string;
};
