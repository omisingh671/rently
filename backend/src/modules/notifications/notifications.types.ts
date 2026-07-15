import type {
  NotificationChannel,
  NotificationEventKey,
} from "@/generated/prisma/enums.js";

export type NotificationPayload = {
  recipientName?: string;
  propertyName?: string;
  bookingReference?: string;
  amount?: string;
  currency?: string;
  checkIn?: string;
  checkOut?: string;
};

export type BusinessNotification = {
  eventKey: NotificationEventKey;
  channel?: NotificationChannel;
  propertyId?: string;
  recipient: string;
  businessEventId: string;
  payload: NotificationPayload;
};

export type ProviderSendInput = {
  jobId: string;
  eventKey: NotificationEventKey;
  recipient: string;
  payload: NotificationPayload;
};

export type ProviderSendResult = {
  providerMessageId?: string;
};

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  isAvailable(): boolean;
  send(input: ProviderSendInput): Promise<ProviderSendResult>;
}
