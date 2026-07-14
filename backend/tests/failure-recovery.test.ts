import assert from "node:assert/strict";
import { after, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { runWithBoundedRetry } from "@/common/retry/retry-policy.js";
import { prisma } from "@/db/prisma.js";
import { UserRole } from "@/generated/prisma/client.js";
import {
  createPasswordResetEmailJob,
  processPasswordResetEmailJob,
} from "@/modules/email-deliveries/email-deliveries.service.js";

const testId = `recovery-${Date.now()}`;

after(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: testId } } });
  await prisma.$disconnect();
});

test("retry exhaustion returns a stable error and validation errors are not retried", async () => {
  let transientAttempts = 0;
  await assert.rejects(
    runWithBoundedRetry({
      operation: async () => {
        transientAttempts += 1;
        throw new Error("temporary database timeout");
      },
      isRetryable: () => true,
      maxAttempts: 3,
      mapExhaustedError: () =>
        new HttpError(503, "DATABASE_UNAVAILABLE", "Database is temporarily unavailable"),
    }),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 503 &&
      error.code === "DATABASE_UNAVAILABLE",
  );
  assert.equal(transientAttempts, 3);

  let validationAttempts = 0;
  await assert.rejects(
    runWithBoundedRetry({
      operation: async () => {
        validationAttempts += 1;
        throw new HttpError(409, "VERSION_CONFLICT", "Version conflict");
      },
      isRetryable: () => false,
    }),
    (error: unknown) => error instanceof HttpError && error.code === "VERSION_CONFLICT",
  );
  assert.equal(validationAttempts, 1);
});

test("failed transient transactions leave no partial database state", async () => {
  let attempts = 0;
  await assert.rejects(
    runWithBoundedRetry({
      operation: () =>
        prisma.$transaction(async (tx) => {
          attempts += 1;
          await tx.user.create({
            data: {
              fullName: "Rolled Back User",
              email: `${testId}-rollback-${attempts}@sucasa.test`,
              passwordHash: "not-used",
              role: UserRole.GUEST,
            },
          });
          throw new Error("simulated transient timeout");
        }),
      isRetryable: () => true,
      maxAttempts: 2,
      mapExhaustedError: () => new Error("stable database unavailable"),
    }),
    /stable database unavailable/,
  );

  assert.equal(
    await prisma.user.count({ where: { email: { contains: `${testId}-rollback` } } }),
    0,
  );
});

test("email failure is durable, retryable, and replay does not send twice", async () => {
  const user = await prisma.user.create({
    data: {
      fullName: "Recovery Guest",
      email: `${testId}-email@sucasa.test`,
      passwordHash: "not-used",
      role: UserRole.GUEST,
    },
  });
  const job = await createPasswordResetEmailJob(user);

  await assert.rejects(
    processPasswordResetEmailJob(job.id, {
      send: async () => {
        throw new Error("SMTP unavailable");
      },
    }),
    (error: unknown) => error instanceof HttpError && error.code === "EMAIL_DELIVERY_FAILED",
  );

  const failed = await prisma.emailDeliveryJob.findUniqueOrThrow({ where: { id: job.id } });
  assert.equal(failed.status, "FAILED");
  assert.match(failed.lastError ?? "", /SMTP unavailable/);
  assert.equal(await prisma.passwordResetToken.count({ where: { userId: user.id } }), 1);

  let sends = 0;
  const succeeded = await processPasswordResetEmailJob(job.id, {
    send: async () => {
      sends += 1;
    },
  });
  assert.equal(succeeded.status, "SUCCEEDED");

  const replayed = await processPasswordResetEmailJob(job.id, {
    send: async () => {
      sends += 1;
    },
  });
  assert.equal(replayed.status, "SUCCEEDED");
  assert.equal(sends, 1);
});
