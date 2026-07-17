import { logError } from "@/common/observability/logger.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingStatus,
  NotificationEventKey,
  Prisma,
} from "@/generated/prisma/client.js";
import { publishBookingNotification } from "@/modules/notifications/notifications.events.js";

const expiryReason = "Automatically cancelled because token payment was not completed before the deadline";

const expireBooking = async (booking: { id: string; version: number }) => {
  const expiredAt = new Date();
  const cancelled = await prisma.$transaction(
    async (tx) => {
      const result = await tx.booking.updateMany({
        where: {
          id: booking.id,
          version: booking.version,
          status: BookingStatus.PENDING,
          paymentExpiresAt: { lte: expiredAt },
        },
        data: {
          status: BookingStatus.CANCELLED,
          version: { increment: 1 },
          cancelledAt: expiredAt,
          cancellationReason: expiryReason,
        },
      });
      if (result.count !== 1) return false;

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.CANCELLED,
          note: expiryReason,
        },
      });
      await tx.inventoryLock.updateMany({
        where: { bookingId: booking.id, releasedAt: null },
        data: { releasedAt: expiredAt },
      });
      return true;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  if (cancelled) {
    await publishBookingNotification({
      eventKey: NotificationEventKey.BOOKING_CANCELLED,
      businessEventId: `${booking.id}:${booking.version + 1}:payment-expired`,
      bookingId: booking.id,
    });
  }
};

export const processExpiredPendingBookings = async () => {
  let processed = 0;
  for (let batch = 0; batch < 10; batch += 1) {
    const expired = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING,
        paymentExpiresAt: { lte: new Date() },
      },
      orderBy: { paymentExpiresAt: "asc" },
      take: 50,
      select: { id: true, version: true },
    });
    await Promise.all(expired.map((booking) => expireBooking(booking)));
    processed += expired.length;
    if (expired.length < 50) break;
  }
  return processed;
};

export const startPendingBookingExpiryProcessor = () => {
  const process = () =>
    processExpiredPendingBookings().catch((error) =>
      logError("Pending booking expiry processor failed", error),
    );
  void process();
  const timer = setInterval(() => void process(), 30_000);
  timer.unref();
  return () => clearInterval(timer);
};
