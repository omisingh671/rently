import "dotenv/config";

import { app } from "./app.js";
import { prisma } from "@/db/prisma.js";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/**
 * --------------------------------------------------
 * Graceful Shutdown (Prisma v7 compatible)
 * --------------------------------------------------
 */
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down...`);
  await prisma.$disconnect();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
