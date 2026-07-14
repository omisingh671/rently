import { HttpError } from "@/common/errors/http-error.js";
import { getCorrelationId } from "@/common/observability/request-context.js";
import { ensurePropertyExists, getActor } from "@/common/services/scoping.service.js";
import {
  NotificationSettingState,
  UserRole,
  type NotificationChannel,
  type NotificationEventKey,
} from "@/generated/prisma/client.js";
import {
  isChannelAvailable,
  isPropertyScopedEvent,
  notificationChannels,
  notificationEvents,
} from "./notifications.catalog.js";
import * as repo from "./notifications.repository.js";

const assertSuperAdmin = async (userId: string) => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Super Admin access required");
  }
};

const assertCanEnable = (channel: NotificationChannel, enabled: boolean) => {
  if (enabled && !isChannelAvailable(channel)) {
    throw new HttpError(409, "NOTIFICATION_CHANNEL_UNAVAILABLE", `${channel} is not available yet`);
  }
};

export const resolveEffectiveSetting = async (input: {
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  propertyId?: string;
}) => {
  const global = await repo.findGlobalSetting(input.eventKey, input.channel);
  if (input.propertyId && isPropertyScopedEvent(input.eventKey)) {
    const override = await repo.findPropertyOverride(input.propertyId, input.eventKey, input.channel);
    if (override?.state === NotificationSettingState.ENABLED) return { enabled: true, source: "PROPERTY" as const };
    if (override?.state === NotificationSettingState.DISABLED) return { enabled: false, source: "PROPERTY" as const };
  }
  return { enabled: global?.enabled ?? false, source: "GLOBAL" as const };
};

export const getSettings = async (userId: string, propertyId?: string) => {
  await assertSuperAdmin(userId);
  if (propertyId) await ensurePropertyExists(propertyId);
  const [globals, overrides] = await Promise.all([
    repo.listGlobalSettings(),
    propertyId ? repo.listPropertyOverrides(propertyId) : Promise.resolve([]),
  ]);
  const globalMap = new Map(globals.map((item) => [`${item.eventKey}:${item.channel}`, item.enabled]));
  const overrideMap = new Map(overrides.map((item) => [`${item.eventKey}:${item.channel}`, item.state]));

  return {
    channels: notificationChannels,
    events: notificationEvents.map((event) => ({
      ...event,
      settings: notificationChannels.map((channel) => {
        const key = `${event.key}:${channel.key}`;
        const globalEnabled = globalMap.get(key) ?? false;
        const state = propertyId && event.propertyScoped
          ? (overrideMap.get(key) ?? NotificationSettingState.USE_GLOBAL)
          : null;
        const effectiveEnabled = state === NotificationSettingState.ENABLED
          ? true
          : state === NotificationSettingState.DISABLED
            ? false
            : globalEnabled;
        return { channel: channel.key, globalEnabled, overrideState: state, effectiveEnabled };
      }),
    })),
  };
};

export const setGlobalSetting = async (userId: string, input: {
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  enabled: boolean;
}) => {
  await assertSuperAdmin(userId);
  assertCanEnable(input.channel, input.enabled);
  return repo.updateGlobalSetting({ ...input, actorUserId: userId, correlationId: getCorrelationId() });
};

export const setPropertyOverride = async (userId: string, propertyId: string, input: {
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  state: NotificationSettingState;
}) => {
  await assertSuperAdmin(userId);
  await ensurePropertyExists(propertyId);
  if (!isPropertyScopedEvent(input.eventKey)) {
    throw new HttpError(400, "NOTIFICATION_EVENT_NOT_PROPERTY_SCOPED", "This event only supports global settings");
  }
  assertCanEnable(input.channel, input.state === NotificationSettingState.ENABLED);
  await repo.updatePropertyOverride({ ...input, propertyId, actorUserId: userId, correlationId: getCorrelationId() });
  return { propertyId, ...input };
};

export const getAudits = async (userId: string) => {
  await assertSuperAdmin(userId);
  const rows = await repo.listAudits();
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
};
