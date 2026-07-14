import assert from "node:assert/strict";
import test from "node:test";

import { countRoomsWithoutActivePricing } from "../src/features/dashboard/pricingCoverage.ts";

const rooms = [
  { roomId: "room-1", unitId: "unit-1", isActive: true },
  { roomId: "room-2", unitId: "unit-1", isActive: true },
  { roomId: "room-3", unitId: "unit-2", isActive: true },
];

test("property-wide pricing covers every active room", () => {
  assert.equal(
    countRoomsWithoutActivePricing(rooms, [
      { roomId: null, unitId: null },
    ]),
    0,
  );
});

test("unit and room overrides cover only their applicable rooms", () => {
  assert.equal(
    countRoomsWithoutActivePricing(rooms, [
      { roomId: null, unitId: "unit-1" },
      { roomId: "room-3", unitId: "unit-2" },
    ]),
    0,
  );

  assert.equal(
    countRoomsWithoutActivePricing(rooms, [
      { roomId: "room-1", unitId: "unit-1" },
    ]),
    2,
  );
});
