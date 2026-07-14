import crypto from "node:crypto";
import { prisma } from "@/db/prisma.js";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";
import { getCorrelationId } from "@/common/observability/request-context.js";
import { logError } from "@/common/observability/logger.js";
import { sendResetPasswordEmail } from "@/modules/auth/email/resetPassword.email.js";
import { UserRole } from "@/generated/prisma/client.js";

const mapJob = (job: Awaited<ReturnType<typeof prisma.emailDeliveryJob.findUniqueOrThrow>>) => ({
  id: job.id,
  type: job.type,
  status: job.status,
  userId: job.userId,
  recipient: job.recipient,
  attemptCount: job.attemptCount,
  maxAttempts: job.maxAttempts,
  lastError: job.lastError ?? null,
  correlationId: job.correlationId ?? null,
  sentAt: job.sentAt?.toISOString() ?? null,
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
});

const assertSuperAdmin = async (userId: string) => {
  const actor = await prisma.user.findUnique({ where: { id: userId } });
  if (!actor || actor.role !== UserRole.SUPER_ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Super Admin access required");
  }
};

export const createPasswordResetEmailJob = (
  user: { id: string; email: string },
  appUrl = env.FRONTEND_URL,
  tokenTtlMinutes = 15,
) =>
  prisma.emailDeliveryJob.create({
    data: {
      type: "PASSWORD_RESET",
      userId: user.id,
      recipient: user.email,
      appUrl,
      tokenTtlMinutes,
      correlationId: getCorrelationId(),
    },
  });

export const processPasswordResetEmailJob = async (
  jobId: string,
  dependencies: {
    send?: typeof sendResetPasswordEmail;
  } = {},
) => {
  const claim = await prisma.emailDeliveryJob.updateMany({
    where: {
      id: jobId,
      OR: [
        { status: { in: ["PENDING", "FAILED"] }, attemptCount: { lt: 3 } },
        {
          status: "PROCESSING",
          processingStartedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
        },
      ],
    },
    data: {
      status: "PROCESSING",
      attemptCount: { increment: 1 },
      lastError: null,
      processingStartedAt: new Date(),
    },
  });
  if (claim.count !== 1) {
    const current = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    if (current.status === "SUCCEEDED") return mapJob(current);
    throw new HttpError(
      current.status === "PROCESSING" ? 409 : 503,
      current.status === "PROCESSING"
        ? "EMAIL_DELIVERY_IN_PROGRESS"
        : "EMAIL_DELIVERY_RETRY_REQUIRED",
      current.status === "PROCESSING"
        ? "Email delivery is already in progress"
        : "Email delivery requires an operator retry",
      { jobId, correlationId: current.correlationId },
    );
  }

  const job = await prisma.emailDeliveryJob.findUniqueOrThrow({
    where: { id: jobId },
  });
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: job.userId } });
    await tx.passwordResetToken.create({
      data: {
        userId: job.userId,
        tokenHash,
        expiresAt: new Date(Date.now() + job.tokenTtlMinutes * 60 * 1000),
      },
    });
  });

  try {
    await (dependencies.send ?? sendResetPasswordEmail)(
      job.recipient,
      rawToken,
      {
        appUrl: job.appUrl,
        messageId: `<password-reset-${job.id}@rently.local>`,
      },
    );
    return mapJob(
      await prisma.emailDeliveryJob.update({
        where: { id: job.id },
        data: {
          status: "SUCCEEDED",
          sentAt: new Date(),
          processingStartedAt: null,
          lastError: null,
        },
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email failure";
    const failed = await prisma.emailDeliveryJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        lastError: message.slice(0, 4000),
        processingStartedAt: null,
      },
    });
    logError("Password reset email delivery failed", error, {
      operation: "email.password-reset",
      emailDeliveryJobId: job.id,
      correlationId: job.correlationId,
    });
    throw new HttpError(
      503,
      "EMAIL_DELIVERY_FAILED",
      "Password reset email could not be delivered",
      { jobId: failed.id, correlationId: failed.correlationId },
    );
  }
};

export const queuePasswordResetEmail = async (
  user: { id: string; email: string },
  appUrl?: string,
  tokenTtlMinutes?: number,
) => {
  const job = await createPasswordResetEmailJob(user, appUrl, tokenTtlMinutes);
  return processPasswordResetEmailJob(job.id);
};

export const listEmailDeliveryJobs = async (userId: string) => {
  await assertSuperAdmin(userId);
  const jobs = await prisma.emailDeliveryJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return jobs.map(mapJob);
};

export const retryEmailDeliveryJob = async (userId: string, jobId: string) => {
  await assertSuperAdmin(userId);
  const reset = await prisma.emailDeliveryJob.updateMany({
    where: { id: jobId, status: "FAILED" },
    data: {
      status: "PENDING",
      attemptCount: 0,
      lastError: null,
      processingStartedAt: null,
      correlationId: getCorrelationId(),
    },
  });
  if (reset.count !== 1) {
    const existing = await prisma.emailDeliveryJob.findUnique({
      where: { id: jobId },
    });
    if (!existing) {
      throw new HttpError(404, "EMAIL_DELIVERY_NOT_FOUND", "Email delivery not found");
    }
    if (existing.status === "SUCCEEDED") return mapJob(existing);
  }
  return processPasswordResetEmailJob(jobId);
};
