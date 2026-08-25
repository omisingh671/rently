import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { buildBrowserOriginGuard } from "./browser-origin.middleware.js";

test("browser origin guard allows trusted and non-browser requests", async () => {
  const app = express();
  app.use(buildBrowserOriginGuard(["https://app.rently.test"]));
  app.post("/auth/refresh", (_req, res) => res.sendStatus(204));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      res.sendStatus(statusCode);
    },
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/auth/refresh`;

  try {
    const nonBrowser = await fetch(url, { method: "POST" });
    const trusted = await fetch(url, {
      method: "POST",
      headers: { Origin: "https://app.rently.test" },
    });
    const untrusted = await fetch(url, {
      method: "POST",
      headers: { Origin: "https://attacker.rently.test" },
    });

    assert.equal(nonBrowser.status, 204);
    assert.equal(trusted.status, 204);
    assert.equal(untrusted.status, 403);
  } finally {
    server.close();
    await once(server, "close");
  }
});
