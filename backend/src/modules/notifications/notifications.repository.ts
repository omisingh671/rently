import { Prisma } from "@/generated/prisma/client.js";
import type {
  NotificationChannel,
  NotificationEventKey,
  NotificationSettingState,
} from "@/generated/prisma/enums.js";
import { prisma } from "@/db/prisma.js";
import type { NotificationPayload } from "./notifications.types.js";

export const listGlobalSettings = () => prisma.notificationGlobalSetting.findMany();

export const listPropertyOverrides = (propertyId: string) =>
  prisma.propertyNotificationOverride.findMany({ where: { propertyId } });

export const findGlobalSetting = (
  eventKey: NotificationEventKey,
  channel: NotificationChannel,
) => prisma.notificationGlobalSetting.findUnique({ where: { eventKey_channel: { eventKey, channel } } });

export const findPropertyOverride = (
  propertyId: string,
  eventKey: NotificationEventKey,
  channel: NotificationChannel,
) => prisma.propertyNotificationOverride.findUnique({
  where: { propertyId_eventKey_channel: { propertyId, eventKey, channel } },
});

export const updateGlobalSetting = async (input: {
  actorUserId: string;
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  enabled: boolean;
  correlationId?: string;
}) => prisma.$transaction(async (tx) => {
  const previous = await tx.notificationGlobalSetting.findUnique({
    where: { eventKey_channel: { eventKey: input.eventKey, channel: input.channel } },
  });
  const setting = await tx.notificationGlobalSetting.upsert({
    where: { eventKey_channel: { eventKey: input.eventKey, channel: input.channel } },
    create: { eventKey: input.eventKey, channel: input.channel, enabled: input.enabled },
    update: { enabled: input.enabled },
  });
  await tx.notificationSettingAudit.create({
    data: {
      actorUserId: input.actorUserId,
      scope: "GLOBAL",
      eventKey: input.eventKey,
      channel: input.channel,
      previousState: previous?.enabled ? "ENABLED" : "DISABLED",
      nextState: input.enabled ? "ENABLED" : "DISABLED",
      ...(input.correlationId !== undefined && { correlationId: input.correlationId }),
    },
  });
  return setting;
});

export const updatePropertyOverride = async (input: {
  actorUserId: string;
  propertyId: string;
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  state: NotificationSettingState;
  correlationId?: string;
}) => prisma.$transaction(async (tx) => {
  const key = {
    propertyId: input.propertyId,
    eventKey: input.eventKey,
    channel: input.channel,
  };
  const previous = await tx.propertyNotificationOverride.findUnique({
    where: { propertyId_eventKey_channel: key },
  });

  if (input.state === "USE_GLOBAL") {
    await tx.propertyNotificationOverride.deleteMany({ where: key });
  } else {
    await tx.propertyNotificationOverride.upsert({
      where: { propertyId_eventKey_channel: key },
      create: { ...key, state: input.state },
      update: { state: input.state },
    });
  }

  await tx.notificationSettingAudit.create({
    data: {
      actorUserId: input.actorUserId,
      scope: "PROPERTY",
      propertyId: input.propertyId,
      eventKey: input.eventKey,
      channel: input.channel,
      previousState: previous?.state ?? "USE_GLOBAL",
      nextState: input.state,
      ...(input.correlationId !== undefined && { correlationId: input.correlationId }),
    },
  });
});

export const listAudits = () => prisma.notificationSettingAudit.findMany({
  include: {
    actor: { select: { id: true, fullName: true, email: true } },
    property: { select: { id: true, name: true } },
  },
  orderBy: { createdAt: "desc" },
  take: 100,
});

export const createDeliveryJob = (input: {
  idempotencyKey: string;
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  propertyId?: string;
  recipient: string;
  payload: NotificationPayload;
  correlationId?: string;
}) => prisma.notificationDeliveryJob.upsert({
  where: { idempotencyKey: input.idempotencyKey },
  create: {
    idempotencyKey: input.idempotencyKey,
    eventKey: input.eventKey,
    channel: input.channel,
    ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
    recipient: input.recipient,
    payload: input.payload as Prisma.InputJsonValue,
    ...(input.correlationId !== undefined && { correlationId: input.correlationId }),
  },
  update: {},
});

export const listDeliveryJobs = () => prisma.notificationDeliveryJob.findMany({
  orderBy: { createdAt: "desc" },
  take: 100,
});
