import "dotenv/config";

import { app } from "./app.js";
import { prisma } from "@/db/prisma.js";
import { startNotificationProcessor } from "@/modules/notifications/notifications.delivery.service.js";
import { startPendingBookingExpiryProcessor } from "@/modules/bookings/bookings.expiry.js";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const stopNotificationProcessor = startNotificationProcessor();
const stopPendingBookingExpiryProcessor = startPendingBookingExpiryProcessor();

/**
 * --------------------------------------------------
 * Graceful Shutdown (Prisma v7 compatible)
 * --------------------------------------------------
 */
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`Received ${signal}. Shutting down...`);
  stopNotificationProcessor();
  stopPendingBookingExpiryProcessor();

  const serverClosed = new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  server.closeIdleConnections();

  const forceCloseTimer = setTimeout(() => {
    server.closeAllConnections();
  }, 5_000);
  forceCloseTimer.unref();

  await serverClosed;
  clearTimeout(forceCloseTimer);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
