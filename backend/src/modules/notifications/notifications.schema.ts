import { z } from "zod";
import {
  NotificationChannel,
  NotificationEventKey,
  NotificationSettingState,
} from "@/generated/prisma/enums.js";

export const settingsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
});

export const updateGlobalSettingSchema = z.object({
  eventKey: z.enum(NotificationEventKey),
  channel: z.enum(NotificationChannel),
  enabled: z.boolean(),
});

export const updatePropertyOverrideSchema = z.object({
  eventKey: z.enum(NotificationEventKey),
  channel: z.enum(NotificationChannel),
  state: z.enum(NotificationSettingState),
});

export const propertyParamsSchema = z.object({ propertyId: z.string().uuid() });
export const deliveryParamsSchema = z.object({ id: z.string().uuid() });
