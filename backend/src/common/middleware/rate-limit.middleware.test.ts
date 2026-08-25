import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import express from "express";
import { requestContextMiddleware } from "@/common/observability/request-context.js";
import { buildRateLimit } from "./rate-limit.middleware.js";

test("endpoint rate limiting allows normal traffic and throttles a burst", async () => {
  const app = express();
  app.use(requestContextMiddleware);
  app.get(
    "/limited",
    buildRateLimit(60_000, 2, "TEST_RATE_LIMITED"),
    (_req, res) => res.json({ success: true }),
  );

  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const url = `http://127.0.0.1:${address.port}/limited`;

  try {
    const first = await fetch(url);
    const second = await fetch(url);
    const throttled = await fetch(url);

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(throttled.status, 429);
    assert.equal(throttled.headers.get("retry-after"), "60");
    assert.deepEqual(await throttled.json(), {
      error: {
        code: "TEST_RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        correlationId: throttled.headers.get("x-correlation-id"),
      },
    });
  } finally {
    server.close();
    await once(server, "close");
  }
});
