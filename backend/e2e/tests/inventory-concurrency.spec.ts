import { prisma } from "../../src/db/prisma.js";
import { expect, test } from "../test.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  getRoomAvailabilityOption,
  loginDashboard,
  publicHeaders,
} from "../helpers.js";
import { e2eFixture } from "../fixtures.js";

test("public availability rejects a back-dated stay", async ({ request }) => {
  const checkIn = futureDate(-2);
  const checkOut = futureDate(-1);
  const response = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: { checkIn, checkOut, guests: 1, comfortOption: "NON_AC" },
    },
  );

  expect(response.status()).toBe(422);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "PAST_CHECK_IN_NOT_ALLOWED" },
  });
});

test("dirty rooms remain off sale until housekeeping inspection", async ({
  request,
}) => {
  const checkIn = futureDate(75);
  const checkOut = futureDate(77);
  const readAvailability = async () => {
    const response = await request.post(
      `${apiPrefix}/public/availability/check`,
      {
        headers: publicHeaders,
        data: { checkIn, checkOut, guests: 1, comfortOption: "NON_AC" },
      },
    );
    expect(response.status()).toBe(200);
    const body = (await response.json()) as {
      data: {
        options: Array<{
          optionId: string;
          optionType: string;
          propertyId: string;
          nightlyTotal: number;
          items: Array<{ roomId: string | null; unitId: string | null }>;
        }>;
      };
    };
    return body.data.options;
  };
  const readyOptions = await readAvailability();
  const selectedOption = readyOptions.find(
    (option) => option.optionType === "ROOM" && option.nightlyTotal === 1500,
  );
  expect(
    selectedOption,
    "Expected the inspected room to be sellable",
  ).toBeTruthy();
  if (!selectedOption) throw new Error("Expected a sellable room");
  const standardRoomPricing = await prisma.roomPricing.findMany({
    where: {
      propertyId: e2eFixture.property.id,
      price: 1500,
      roomId: { not: null },
    },
    select: { roomId: true },
  });
  const standardRoomIds = [
    ...new Set(
      standardRoomPricing.flatMap((pricing) =>
        pricing.roomId ? [pricing.roomId] : [],
      ),
    ),
  ];
  expect(standardRoomIds.length).toBeGreaterThan(0);
  const includesStandardRoomRate = (
    options: Awaited<ReturnType<typeof readAvailability>>,
  ) =>
    options.some(
      (option) => option.optionType === "ROOM" && option.nightlyTotal === 1500,
    );

  await prisma.room.updateMany({
    where: { id: { in: standardRoomIds } },
    data: { housekeepingStatus: "DIRTY" },
  });

  try {
    expect(includesStandardRoomRate(await readAvailability())).toBe(false);

    const staleLock = await request.post(
      `${apiPrefix}/public/inventory-locks`,
      {
        headers: publicHeaders,
        data: {
          bookingOptionId: selectedOption.optionId,
          propertyId: selectedOption.propertyId,
          from: checkIn,
          to: checkOut,
          guests: 1,
          comfortOption: "NON_AC",
        },
      },
    );
    expect(staleLock.status()).toBe(409);
    await expect(staleLock.json()).resolves.toMatchObject({
      error: { code: "BOOKING_OPTION_UNAVAILABLE" },
    });

    const admin = await loginDashboard(request, e2eFixture.users.admin);
    const roomBoard = await request.get(
      `${apiPrefix}/properties/${e2eFixture.property.id}/room-board`,
      {
        headers: bearerHeaders(admin.accessToken),
        params: { from: checkIn, to: checkOut },
      },
    );
    expect(roomBoard.status()).toBe(200);
    const roomBoardBody = (await roomBoard.json()) as {
      data: {
        summary: { HOUSEKEEPING: number };
        units: Array<{
          rooms: Array<{
            roomId: string;
            boardStatus: string;
            housekeepingStatus: string;
          }>;
        }>;
      };
    };
    expect(roomBoardBody.data.summary.HOUSEKEEPING).toBeGreaterThanOrEqual(
      standardRoomIds.length,
    );
    const boardRooms = roomBoardBody.data.units.flatMap((unit) => unit.rooms);
    for (const roomId of standardRoomIds) {
      expect(boardRooms).toContainEqual(
        expect.objectContaining({
          roomId,
          boardStatus: "HOUSEKEEPING",
          housekeepingStatus: "DIRTY",
        }),
      );
    }
  } finally {
    await prisma.room.updateMany({
      where: { id: { in: standardRoomIds } },
      data: { housekeepingStatus: "INSPECTED" },
    });
  }

  expect(includesStandardRoomRate(await readAvailability())).toBe(true);
});

test("only one concurrent inventory lock can hold the same room", async ({
  request,
}) => {
  const checkIn = futureDate(30);
  const checkOut = futureDate(32);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const lockPayload = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
  };

  const responses = await Promise.all([
    request.post(`${apiPrefix}/public/inventory-locks`, {
      headers: publicHeaders,
      data: lockPayload,
    }),
    request.post(`${apiPrefix}/public/inventory-locks`, {
      headers: publicHeaders,
      data: lockPayload,
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
  const rejected = responses.find((response) => response.status() === 409)!;
  const rejectedBody = (await rejected.json()) as { error: { code: string } };
  expect([
    "BOOKING_OPTION_UNAVAILABLE",
    "INVENTORY_LOCK_CONFLICT",
    "SPACE_NOT_AVAILABLE",
  ]).toContain(rejectedBody.error.code);
});

test("only one concurrent booking can reserve the same room", async ({
  request,
}) => {
  const checkIn = futureDate(45);
  const checkOut = futureDate(47);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const bookingPayload = (sequence: number) => ({
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
    guestDetails: {
      name: `Concurrency Guest ${sequence}`,
      email: `concurrency-${sequence}@e2e.rently.test`,
      contactNumber: `900000000${sequence}`,
    },
  });

  const responses = await Promise.all([
    request.post(`${apiPrefix}/public/bookings`, {
      headers: publicHeaders,
      data: bookingPayload(1),
    }),
    request.post(`${apiPrefix}/public/bookings`, {
      headers: publicHeaders,
      data: bookingPayload(2),
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
  const created = responses.find((response) => response.status() === 201)!;
  await expect(created.json()).resolves.toMatchObject({
    data: { status: "PENDING" },
  });
});
