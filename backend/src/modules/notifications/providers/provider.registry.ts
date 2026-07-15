import { NotificationChannel } from "@/generated/prisma/enums.js";
import type { NotificationProvider } from "../notifications.types.js";
import { EmailProvider } from "./email.provider.js";

const providers = new Map<NotificationChannel, NotificationProvider>([
  [NotificationChannel.EMAIL, new EmailProvider()],
]);

export const getNotificationProvider = (channel: NotificationChannel) =>
  providers.get(channel);
