import assert from "node:assert/strict";
import test from "node:test";
import { BookingStatus } from "@/generated/prisma/client.js";
import {
  getLifecycleReversalTarget,
  getVacatedRoomIds,
} from "./bookings.helper.js";
import {
  reverseBookingLifecycleSchema,
  updateBookingStatusSchema,
} from "./bookings.schema.js";
import { buildRoomAllocationSyncPlan } from "./bookings.allocations.js";

test("maps only explicit lifecycle reversals", () => {
  assert.equal(
    getLifecycleReversalTarget(BookingStatus.CHECKED_IN),
    BookingStatus.CONFIRMED,
  );
  assert.equal(
    getLifecycleReversalTarget(BookingStatus.CHECKED_OUT),
    BookingStatus.CHECKED_IN,
  );
  assert.equal(
    getLifecycleReversalTarget(BookingStatus.NO_SHOW),
    BookingStatus.CONFIRMED,
  );
  assert.equal(getLifecycleReversalTarget(BookingStatus.PENDING), null);
  assert.equal(getLifecycleReversalTarget(BookingStatus.CONFIRMED), null);
  assert.equal(getLifecycleReversalTarget(BookingStatus.CANCELLED), null);
});

test("generic booking update accepts cancellation but rejects arbitrary status", () => {
  assert.equal(
    updateBookingStatusSchema.safeParse({ status: BookingStatus.CANCELLED }).success,
    true,
  );
  assert.equal(
    updateBookingStatusSchema.safeParse({ status: BookingStatus.CHECKED_OUT }).success,
    false,
  );
});

test("room move dirties only rooms no longer assigned", () => {
  assert.deepEqual(
    getVacatedRoomIds(["room-a", "room-b"], ["room-b", "room-c"]),
    ["room-a"],
  );
  assert.deepEqual(getVacatedRoomIds(["room-a"], ["room-a"]), []);
});

test("room allocation sync closes removed rooms and opens only new rooms", () => {
  const effectiveFrom = new Date("2026-07-17T00:00:00.000Z");
  const plan = buildRoomAllocationSyncPlan(
    [
      {
        id: "allocation-a",
        roomId: "room-a",
        effectiveFrom: new Date("2026-07-15T00:00:00.000Z"),
      },
      {
        id: "allocation-b",
        roomId: "room-b",
        effectiveFrom: new Date("2026-07-15T00:00:00.000Z"),
      },
    ],
    [
      { roomId: "room-b", bookingItemId: "item-b" },
      { roomId: "room-c", bookingItemId: "item-c" },
    ],
    effectiveFrom,
  );

  assert.deepEqual(plan.closures, [
    { id: "allocation-a", effectiveTo: effectiveFrom },
  ]);
  assert.deepEqual(plan.openings, [
    { roomId: "room-c", bookingItemId: "item-c" },
  ]);
});

test("lifecycle reversal requires version and audit note without target status", () => {
  assert.equal(
    reverseBookingLifecycleSchema.safeParse({
      expectedVersion: 3,
      note: "Check-in was recorded against the wrong booking",
    }).success,
    true,
  );
  assert.equal(
    reverseBookingLifecycleSchema.safeParse({
      expectedVersion: 3,
      status: BookingStatus.CANCELLED,
      note: "Unsafe target",
    }).success,
    false,
  );
  assert.equal(
    reverseBookingLifecycleSchema.safeParse({ expectedVersion: 3, note: "" })
      .success,
    false,
  );
});
