import type { Server } from "node:http";
import { expect, test as base } from "playwright/test";

type WorkerFixtures = {
  apiServer: void;
};

const port = Number(process.env.E2E_PORT ?? 4100);

const listen = async (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

const close = async (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    server.closeIdleConnections();
    server.closeAllConnections();
  });

export const test = base.extend<object, WorkerFixtures>({
  apiServer: [
    // Playwright requires fixture callbacks to use an object destructuring pattern.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      process.env.NODE_ENV = "test";
      process.env.RATE_LIMIT_ENABLED = "false";
      process.env.STORAGE_PROVIDER = "local";

      const [{ app }, { prisma }] = await Promise.all([
        import("../src/app.js"),
        import("../src/db/prisma.js"),
      ]);
      const server = app.listen(port);
      await listen(server);

      try {
        await use();
      } finally {
        await close(server);
        await prisma.$disconnect();
      }
    },
    { scope: "worker", auto: true },
  ],
});

export { expect };
