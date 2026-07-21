import assert from "node:assert/strict";
import test from "node:test";
import {
  BookingStatus,
  FolioChargeStatus,
} from "@/generated/prisma/client.js";
import {
  assertStayExtensionPricingActionAllowed,
  findMatchingLateCheckoutExtensionCharge,
  getLifecycleReversalTarget,
  getVacatedRoomIds,
  shouldCreateStayExtensionCharge,
} from "./bookings.helper.js";
import {
  commitStayExtensionSchema,
  reverseBookingLifecycleSchema,
  updateBookingStatusSchema,
} from "./bookings.schema.js";
import { buildRoomAllocationSyncPlan } from "./bookings.allocations.js";

const lateCheckoutPreview = {
  extraNights: 36,
  effectiveDate: "2026-06-14",
  originalCheckOutDate: "2026-06-14",
  actualCheckOutDate: "2026-07-20",
  currentAssignment: "Room 100-A",
  nightlyRate: "2000",
  baseAmount: "72000",
  taxAmount: "0",
  totalAmount: "72000",
  taxBreakdown: [],
  pricingSnapshot: [],
};

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

test("late checkout charge matching prefers an active charge over an older void", () => {
  const charge = findMatchingLateCheckoutExtensionCharge(
    [
      {
        id: "void-charge",
        status: FolioChargeStatus.VOID,
        type: "EXTENSION",
        metadata: {
          source: "LATE_CHECKOUT_EXTENSION",
          originalCheckOutDate: "2026-06-14",
          actualCheckOutDate: "2026-07-20",
          extraNights: 36,
        },
      },
      {
        id: "active-charge",
        status: FolioChargeStatus.ACTIVE,
        type: "EXTENSION",
        metadata: {
          source: "LATE_CHECKOUT_EXTENSION",
          originalCheckOutDate: "2026-06-14",
          actualCheckOutDate: "2026-07-20",
          extraNights: 36,
        },
      },
    ],
    lateCheckoutPreview,
  );

  assert.equal(charge?.id, "active-charge");
});

test("late checkout charge matching keeps a voided charge as the waiver", () => {
  const charge = findMatchingLateCheckoutExtensionCharge(
    [
      {
        id: "void-charge",
        status: FolioChargeStatus.VOID,
        type: "EXTENSION",
        metadata: {
          source: "LATE_CHECKOUT_EXTENSION",
          originalCheckOutDate: "2026-06-14",
          actualCheckOutDate: "2026-07-20",
          extraNights: 36,
        },
      },
    ],
    lateCheckoutPreview,
  );

  assert.equal(charge?.status, FolioChargeStatus.VOID);
});

test("stay extension defaults to the existing charged pricing treatment", () => {
  const result = commitStayExtensionSchema.parse({
    expectedVersion: 2,
    newCheckOut: "2026-07-25T00:00:00.000Z",
    pricingFingerprint: "a".repeat(64),
    note: "Guest requested additional nights",
  });

  assert.equal(result.pricingAction, "CHARGE");
});

test("stay extension accepts an explicit complimentary pricing treatment", () => {
  const result = commitStayExtensionSchema.safeParse({
    expectedVersion: 2,
    newCheckOut: "2026-07-25T00:00:00.000Z",
    pricingFingerprint: "a".repeat(64),
    pricingAction: "COMPLIMENTARY",
    note: "Approved service recovery",
  });

  assert.equal(result.success, true);
});

test("complimentary stay extensions create no folio charge", () => {
  assert.equal(shouldCreateStayExtensionCharge("CHARGE"), true);
  assert.equal(shouldCreateStayExtensionCharge("COMPLIMENTARY"), false);
});

test("complimentary stay extensions require an admin approval role", () => {
  assert.doesNotThrow(() =>
    assertStayExtensionPricingActionAllowed(
      "COMPLIMENTARY",
      "ADMIN",
    ),
  );
  assert.throws(
    () =>
      assertStayExtensionPricingActionAllowed(
        "COMPLIMENTARY",
        "MANAGER",
      ),
    (error: unknown) =>
      error instanceof Error && error.message.includes("Only Admin"),
  );
});
