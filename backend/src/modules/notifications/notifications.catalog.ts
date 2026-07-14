import {
  NotificationChannel,
  NotificationEventKey,
} from "@/generated/prisma/enums.js";

export const notificationChannels = [
  {
    key: NotificationChannel.EMAIL,
    label: "Email",
    available: true,
  },
  {
    key: NotificationChannel.SMS,
    label: "SMS",
    available: false,
  },
  {
    key: NotificationChannel.WHATSAPP,
    label: "WhatsApp",
    available: false,
  },
] as const;

export const notificationEvents = [
  { key: NotificationEventKey.BOOKING_CREATED, label: "Booking created", propertyScoped: true },
  { key: NotificationEventKey.BOOKING_CANCELLED, label: "Booking cancelled", propertyScoped: true },
  { key: NotificationEventKey.PAYMENT_SUCCEEDED, label: "Payment received", propertyScoped: true },
  { key: NotificationEventKey.REFUND_SUCCEEDED, label: "Refund completed", propertyScoped: true },
  { key: NotificationEventKey.USER_REGISTERED, label: "User registration", propertyScoped: false },
  { key: NotificationEventKey.BOOKING_CHECKED_IN, label: "Guest checked in", propertyScoped: true },
  { key: NotificationEventKey.BOOKING_CHECKED_OUT, label: "Guest checked out", propertyScoped: true },
] as const;

export const isChannelAvailable = (channel: NotificationChannel) =>
  notificationChannels.some((item) => item.key === channel && item.available);

export const isPropertyScopedEvent = (eventKey: NotificationEventKey) =>
  notificationEvents.some((item) => item.key === eventKey && item.propertyScoped);
