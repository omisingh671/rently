import "dotenv/config";

import { app } from "./app.js";
import { prisma } from "@/db/prisma.js";
import { startNotificationProcessor } from "@/modules/notifications/notifications.delivery.service.js";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const stopNotificationProcessor = startNotificationProcessor();

/**
 * --------------------------------------------------
 * Graceful Shutdown (Prisma v7 compatible)
 * --------------------------------------------------
 */
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down...`);
  stopNotificationProcessor();
  await prisma.$disconnect();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
