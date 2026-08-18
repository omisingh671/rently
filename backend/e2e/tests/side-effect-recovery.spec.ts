import { prisma } from "../../src/db/prisma.js";
import { processPasswordResetEmailJob } from "../../src/modules/email-deliveries/email-deliveries.service.js";
import { e2eFixture } from "../fixtures.js";
import { expect, test } from "../test.js";

test("failed email delivery backs off and becomes a durable dead letter", async () => {
  const job = await prisma.emailDeliveryJob.create({
    data: {
      type: "PASSWORD_RESET",
      status: "FAILED",
      userId: e2eFixture.users.guest.id,
      recipient: "unreachable@e2e.rently.test",
      appUrl: "http://localhost:5173",
      nextAttemptAt: new Date(0),
    },
  });
  const send = async () => {
    throw new Error("Synthetic mail transport failure");
  };

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await expect(
      processPasswordResetEmailJob(job.id, { send }),
    ).rejects.toMatchObject({ code: "EMAIL_DELIVERY_FAILED" });
    const current = await prisma.emailDeliveryJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    expect(current.attemptCount).toBe(attempt);
    if (attempt < 3) {
      expect(current.status).toBe("FAILED");
      expect(current.nextAttemptAt).not.toBeNull();
      await prisma.emailDeliveryJob.update({
        where: { id: job.id },
        data: { nextAttemptAt: new Date(0) },
      });
    } else {
      expect(current.status).toBe("DEAD_LETTER");
      expect(current.deadLetteredAt).not.toBeNull();
      expect(current.nextAttemptAt).toBeNull();
    }
  }
});
