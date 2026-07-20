import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";
import { expect, test } from "../test.js";

type BookingResponse = {
  id: string;
  status: string;
  version: number;
  roomId: string | null;
  checkOut: string;
  balanceAmount: string;
  folioTotal: string;
  folioCharges: Array<{
    type: string;
    status: string;
    description: string;
    amount: string;
  }>;
  roomAllocationHistory: Array<{
    roomId: string;
    source: string;
    effectiveTo: string | null;
  }>;
  operationEvents: Array<{ eventType: string; metadata: unknown }>;
};

type RoomMovePreview = {
  movementType: "UPGRADE" | "DOWNGRADE" | "SAME_RATE";
  affectedNights: number;
  currentNightlyRate: string;
  destinationNightlyRate: string;
  totalAdjustment: string;
  pricingFingerprint: string;
  allowedPricingActions: string[];
  downgradeTreatment: string;
};

type ExtensionPreview = {
  extraNights: number;
  nightlyRate: string;
  totalAmount: string;
  resultingBalance: string;
  pricingFingerprint: string;
  conflicts: unknown[];
};

const localDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

test.afterEach(async () => {
  await prisma.room.updateMany({
    where: {
      id: { in: [e2eFixture.roomId, e2eFixture.upgradeRoomId] },
    },
    data: { housekeepingStatus: "INSPECTED" },
  });
});

test("front desk upgrades, downgrades, and extends an occupied stay", async ({
  request,
}) => {
  const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
  const headers = bearerHeaders(frontDesk.accessToken);
  const checkIn = localDate();
  const checkOut = addDays(checkIn, 2);
  const extendedCheckOut = addDays(checkIn, 3);

  const availabilityResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
    {
      headers,
      data: {
        spaceIds: [e2eFixture.pricingId],
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(availabilityResponse.status()).toBe(200);
  const availabilityBody = (await availabilityResponse.json()) as {
    data: {
      items: Array<{
        bookingOptionId: string;
        available: boolean;
      }>;
    };
  };
  const option = availabilityBody.data.items[0];
  expect(option).toMatchObject({ available: true });

  const createResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers,
      data: {
        bookingOptionId: option!.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Room Move Guest",
        guestEmail: "room-move-guest@e2e.rently.test",
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  let booking = ((await createResponse.json()) as { data: BookingResponse })
    .data;
  expect(booking).toMatchObject({
    status: "CONFIRMED",
    roomId: e2eFixture.roomId,
    balanceAmount: "3000",
  });

  const checkInResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-in`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        identityVerified: true,
        allowBalanceDueCheckIn: true,
        note: "Corporate account balance due",
      },
    },
  );
  expect(checkInResponse.status()).toBe(200);
  booking = ((await checkInResponse.json()) as { data: BookingResponse }).data;

  const upgradePreviewResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/room-move/preview`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        roomIds: [e2eFixture.upgradeRoomId],
      },
    },
  );
  expect(upgradePreviewResponse.status()).toBe(200);
  const upgradePreview = (
    (await upgradePreviewResponse.json()) as { data: RoomMovePreview }
  ).data;
  expect(upgradePreview).toMatchObject({
    movementType: "UPGRADE",
    affectedNights: 2,
    currentNightlyRate: "1500",
    destinationNightlyRate: "2000",
    totalAdjustment: "1000",
  });
  expect(upgradePreview.allowedPricingActions).toContain("CHARGE_DIFFERENCE");

  const upgradeResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/room-move`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        roomIds: [e2eFixture.upgradeRoomId],
        note: "Guest accepted premium-room upgrade",
        pricingFingerprint: upgradePreview.pricingFingerprint,
        expectedAdjustmentAmount: Number(upgradePreview.totalAdjustment),
        pricingAction: "CHARGE_DIFFERENCE",
      },
    },
  );
  expect(upgradeResponse.status()).toBe(200);
  booking = ((await upgradeResponse.json()) as { data: BookingResponse }).data;
  expect(booking).toMatchObject({
    roomId: e2eFixture.upgradeRoomId,
    folioTotal: "1000",
    balanceAmount: "4000",
  });

  const downgradePreviewResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/room-move/preview`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        roomIds: [e2eFixture.downgradeRoomId],
      },
    },
  );
  expect(downgradePreviewResponse.status()).toBe(200);
  const downgradePreview = (
    (await downgradePreviewResponse.json()) as { data: RoomMovePreview }
  ).data;
  expect(downgradePreview).toMatchObject({
    movementType: "DOWNGRADE",
    affectedNights: 2,
    currentNightlyRate: "2000",
    destinationNightlyRate: "1000",
    totalAdjustment: "-2000",
    downgradeTreatment: "NO_CREDIT",
  });
  expect(downgradePreview.allowedPricingActions).toEqual(["NO_CREDIT"]);

  const downgradeResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/room-move`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        roomIds: [e2eFixture.downgradeRoomId],
        note: "Guest requested economy room; no-credit policy accepted",
        pricingFingerprint: downgradePreview.pricingFingerprint,
        expectedAdjustmentAmount: Number(downgradePreview.totalAdjustment),
        pricingAction: "NO_CREDIT",
      },
    },
  );
  expect(downgradeResponse.status()).toBe(200);
  booking = ((await downgradeResponse.json()) as { data: BookingResponse })
    .data;
  expect(booking).toMatchObject({
    roomId: e2eFixture.downgradeRoomId,
    folioTotal: "1000",
    balanceAmount: "4000",
  });
  expect(booking.folioCharges).toHaveLength(1);

  const extensionPreviewResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/stay-extension/preview`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        newCheckOut: extendedCheckOut,
      },
    },
  );
  expect(extensionPreviewResponse.status()).toBe(200);
  const extensionPreview = (
    (await extensionPreviewResponse.json()) as { data: ExtensionPreview }
  ).data;
  expect(extensionPreview).toMatchObject({
    extraNights: 1,
    nightlyRate: "1000",
    totalAmount: "1000",
    resultingBalance: "5000",
    conflicts: [],
  });

  const extensionResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/stay-extension`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        newCheckOut: extendedCheckOut,
        pricingFingerprint: extensionPreview.pricingFingerprint,
        note: "Guest extended the economy room by one night",
      },
    },
  );
  expect(extensionResponse.status()).toBe(200);
  booking = ((await extensionResponse.json()) as { data: BookingResponse })
    .data;
  expect(booking).toMatchObject({
    status: "CHECKED_IN",
    roomId: e2eFixture.downgradeRoomId,
    folioTotal: "2000",
    balanceAmount: "5000",
  });
  expect(booking.checkOut.slice(0, 10)).toBe(extendedCheckOut);
  expect(booking.folioCharges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        type: "ADJUSTMENT",
        status: "ACTIVE",
        amount: "1000",
      }),
      expect.objectContaining({
        type: "EXTENSION",
        status: "ACTIVE",
        amount: "1000",
      }),
    ]),
  );
  expect(
    booking.operationEvents.filter((event) => event.eventType === "ROOM_MOVE"),
  ).toHaveLength(2);
  expect(
    booking.operationEvents.some(
      (event) => event.eventType === "STAY_EXTENSION",
    ),
  ).toBe(true);

  const activeAllocations = booking.roomAllocationHistory.filter(
    (allocation) => allocation.effectiveTo === null,
  );
  expect(activeAllocations).toEqual([
    expect.objectContaining({
      roomId: e2eFixture.downgradeRoomId,
      source: "ROOM_MOVE",
    }),
  ]);
  expect(
    booking.roomAllocationHistory
      .filter((allocation) => allocation.roomId !== e2eFixture.downgradeRoomId)
      .every((allocation) => allocation.effectiveTo !== null),
  ).toBe(true);

  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const reportStart = addDays(checkIn, -2);
  const analyticsResponse = await request.get(
    `${apiPrefix}/reporting/analytics`,
    {
      headers: bearerHeaders(manager.accessToken),
      params: {
        startDate: reportStart,
        endDate: extendedCheckOut,
        propertyId: e2eFixture.property.id,
      },
    },
  );
  expect(analyticsResponse.status()).toBe(200);
  const analytics = (await analyticsResponse.json()) as {
    data: {
      occupancy: Array<{
        date: string;
        occupiedNights: number;
      }>;
    };
  };
  const occupancyByDate = new Map(
    analytics.data.occupancy.map((item) => [item.date, item.occupiedNights]),
  );
  expect(occupancyByDate.get(reportStart)).toBe(0);
  expect(occupancyByDate.get(addDays(checkIn, -1))).toBe(0);
  expect(occupancyByDate.get(checkIn)).toBe(1);
  expect(occupancyByDate.get(addDays(checkIn, 1))).toBe(1);
  expect(occupancyByDate.get(addDays(checkIn, 2))).toBe(1);
  expect(occupancyByDate.get(extendedCheckOut)).toBe(0);

  const vacatedRooms = await prisma.room.findMany({
    where: {
      id: { in: [e2eFixture.roomId, e2eFixture.upgradeRoomId] },
    },
    select: { id: true, housekeepingStatus: true },
  });
  expect(
    vacatedRooms.every((room) => room.housekeepingStatus === "DIRTY"),
  ).toBe(true);
});
