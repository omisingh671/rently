import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStayStartsOnOrAfterBusinessDate,
  getBusinessDateValue,
} from "./business-date.js";

test("uses the property's timezone when determining today", () => {
  const instant = new Date("2026-07-17T20:00:00.000Z");
  assert.equal(getBusinessDateValue(instant, "Asia/Kolkata"), "2026-07-18");
  assert.equal(getBusinessDateValue(instant, "America/New_York"), "2026-07-17");
});

test("rejects a check-in before the property business date", () => {
  assert.throws(
    () =>
      assertStayStartsOnOrAfterBusinessDate(
        new Date("2026-07-17T00:00:00.000Z"),
        "Asia/Kolkata",
        new Date("2026-07-17T20:00:00.000Z"),
      ),
    (error: unknown) =>
      error instanceof Error && error.message === "Check-in date cannot be earlier than today",
  );
});
