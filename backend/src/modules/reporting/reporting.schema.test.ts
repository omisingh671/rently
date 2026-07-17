import assert from "node:assert/strict";
import test from "node:test";
import {
  createDailyCloseSchema,
  getAnalyticsQuerySchema,
} from "./reporting.schema.js";

test("accepts a 93-day inclusive reporting window", () => {
  const result = getAnalyticsQuerySchema.safeParse({
    startDate: "2026-01-01",
    endDate: "2026-04-03",
  });
  assert.equal(result.success, true);
});

test("rejects reporting windows longer than 93 days", () => {
  const result = getAnalyticsQuerySchema.safeParse({
    startDate: "2026-01-01",
    endDate: "2026-04-04",
  });
  assert.equal(result.success, false);
});

test("validates the immutable daily-close input", () => {
  assert.equal(
    createDailyCloseSchema.safeParse({
      businessDate: "2026-07-16",
      note: "Cash and UPI reconciled",
    }).success,
    true,
  );
  assert.equal(
    createDailyCloseSchema.safeParse({ businessDate: "16-07-2026" }).success,
    false,
  );
});
