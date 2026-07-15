import crypto from "node:crypto";
import { HttpError } from "@/common/errors/http-error.js";
import { logError } from "@/common/observability/logger.js";
import { getCorrelationId } from "@/common/observability/request-context.js";
import { getActor } from "@/common/services/scoping.service.js";
import { prisma } from "@/db/prisma.js";
import {
  NotificationChannel,
  UserRole,
} from "@/generated/prisma/client.js";
import type { NotificationPayload, BusinessNotification } from "./notifications.types.js";
import { getNotificationProvider } from "./providers/provider.registry.js";
import { resolveEffectiveSetting } from "./notifications.settings.service.js";
import * as repo from "./notifications.repository.js";

const mapJob = (job: Awaited<ReturnType<typeof prisma.notificationDeliveryJob.findUniqueOrThrow>>) => ({
  id: job.id,
  eventKey: job.eventKey,
  channel: job.channel,
  propertyId: job.propertyId ?? null,
  recipient: job.recipient,
  status: job.status,
  attemptCount: job.attemptCount,
  maxAttempts: job.maxAttempts,
  lastError: job.lastError ?? null,
  providerMessageId: job.providerMessageId ?? null,
  correlationId: job.correlationId ?? null,
  sentAt: job.sentAt?.toISOString() ?? null,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
});

const assertSuperAdmin = async (userId: string) => {
  const actor = await getActor(userId);
  if (actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Super Admin access required");
  }
};

const buildIdempotencyKey = (input: BusinessNotification, channel: NotificationChannel) =>
  crypto
    .createHash("sha256")
    .update(`${input.eventKey}:${channel}:${input.businessEventId}:${input.recipient.toLowerCase()}`)
    .digest("hex");

export const processNotificationJob = async (jobId: string) => {
  const claim = await prisma.notificationDeliveryJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, attemptCount: { lt: 3 } },
        { status: "PROCESSING", processingStartedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
      ],
    },
    data: {
      status: "PROCESSING",
      attemptCount: { increment: 1 },
      lastError: null,
      processingStartedAt: new Date(),
    },
  });
  if (claim.count !== 1) return;

  const job = await prisma.notificationDeliveryJob.findUniqueOrThrow({ where: { id: jobId } });
  const provider = getNotificationProvider(job.channel);
  try {
    if (!provider?.isAvailable()) {
      throw new Error(`Notification provider ${job.channel} is unavailable`);
    }
    const result = await provider.send({
      jobId: job.id,
      eventKey: job.eventKey,
      recipient: job.recipient,
      payload: job.payload as unknown as NotificationPayload,
    });
    await prisma.notificationDeliveryJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        ...(result.providerMessageId !== undefined && {
          providerMessageId: result.providerMessageId,
        }),
        sentAt: new Date(),
        processingStartedAt: null,
        lastError: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown notification failure";
    await prisma.notificationDeliveryJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: message.slice(0, 4000), processingStartedAt: null },
    });
    logError("Business notification delivery failed", error, {
      operation: "notification.delivery",
      notificationJobId: job.id,
      eventKey: job.eventKey,
      channel: job.channel,
      correlationId: job.correlationId,
    });
  }
};

export const publishBusinessNotification = async (input: BusinessNotification): Promise<void> => {
  try {
    const channel = input.channel ?? NotificationChannel.EMAIL;
    const effective = await resolveEffectiveSetting({
      eventKey: input.eventKey,
      channel,
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
    });
    if (!effective.enabled) return;

    const job = await repo.createDeliveryJob({
      idempotencyKey: buildIdempotencyKey(input, channel),
      eventKey: input.eventKey,
      channel,
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
      recipient: input.recipient,
      payload: input.payload,
      correlationId: getCorrelationId(),
    });
    void processNotificationJob(job.id);
  } catch (error) {
    logError("Business notification enqueue failed", error, {
      operation: "notification.enqueue",
      eventKey: input.eventKey,
      businessEventId: input.businessEventId,
    });
  }
};

export const processPendingNotifications = async () => {
  const jobs = await prisma.notificationDeliveryJob.findMany({
    where: {
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, attemptCount: { lt: 3 } },
        { status: "PROCESSING", processingStartedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true },
  });
  await Promise.all(jobs.map((job) => processNotificationJob(job.id)));
};

export const startNotificationProcessor = () => {
  void processPendingNotifications().catch((error) => logError("Notification processor failed", error));
  const timer = setInterval(() => {
    void processPendingNotifications().catch((error) => logError("Notification processor failed", error));
  }, 30_000);
  timer.unref();
  return () => clearInterval(timer);
};

export const listDeliveryJobs = async (userId: string) => {
  await assertSuperAdmin(userId);
  const jobs = await repo.listDeliveryJobs();
  return jobs.map(mapJob);
};

export const retryDeliveryJob = async (userId: string, jobId: string) => {
  await assertSuperAdmin(userId);
  const reset = await prisma.notificationDeliveryJob.updateMany({
    where: { id: jobId, status: "FAILED" },
    data: { status: "PENDING", attemptCount: 0, lastError: null, processingStartedAt: null },
  });
  if (reset.count !== 1) {
    const existing = await prisma.notificationDeliveryJob.findUnique({ where: { id: jobId } });
    if (!existing) throw new HttpError(404, "NOTIFICATION_DELIVERY_NOT_FOUND", "Notification delivery not found");
    return mapJob(existing);
  }
  await processNotificationJob(jobId);
  return mapJob(await prisma.notificationDeliveryJob.findUniqueOrThrow({ where: { id: jobId } }));
};
