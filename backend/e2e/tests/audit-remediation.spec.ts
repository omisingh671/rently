import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  getRoomAvailabilityOption,
  loginDashboard,
  publicHeaders,
} from "../helpers.js";
import { expect, test } from "../test.js";

test("public availability excludes restricted pricing tiers", async ({ request }) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const headers = bearerHeaders(admin.accessToken);
  const created = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/pricing`,
    {
      headers,
      data: {
        productId: e2eFixture.productId,
        roomId: e2eFixture.roomId,
        rateType: "NIGHTLY",
        pricingTier: "CORPORATE",
        price: 100,
        validFrom: "2020-01-01T00:00:00.000Z",
      },
    },
  );
  expect(created.status()).toBe(201);
  const pricing = (await created.json()) as { data: { id: string } };

  const checkIn = futureDate(100);
  const checkOut = futureDate(101);
  const availability = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: { checkIn, checkOut, guests: 1, comfortOption: "NON_AC" },
    },
  );
  expect(availability.status()).toBe(200);
  const body = (await availability.json()) as {
    data: {
      options: Array<{
        items: Array<{ roomId: string | null; pricePerNight: number }>;
      }>;
    };
  };
  const publicPrices = body.data.options
    .flatMap((option) => option.items)
    .map((item) => item.pricePerNight);

  await prisma.roomPricing.delete({ where: { id: pricing.data.id } });
  expect(publicPrices).not.toContain(100);
  expect(publicPrices.length).toBeGreaterThan(0);
});

test("resolved maintenance no longer marks the room board unavailable", async ({
  request,
}) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const adminHeaders = bearerHeaders(admin.accessToken);
  const managerHeaders = bearerHeaders(manager.accessToken);
  const from = futureDate(110);
  const to = futureDate(111);

  const create = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/maintenance-blocks`,
    {
      headers: adminHeaders,
      data: {
        targetType: "ROOM",
        roomId: e2eFixture.roomId,
        reason: "Synthetic room-board maintenance",
        priority: "MEDIUM",
        startDate: from,
        endDate: to,
      },
    },
  );
  expect(create.status()).toBe(201);
  const block = (await create.json()) as { data: { id: string } };

  const readBoardStatus = async () => {
    const response = await request.get(
      `${apiPrefix}/properties/${e2eFixture.property.id}/room-board`,
      { headers: managerHeaders, params: { from, to } },
    );
    expect(response.status()).toBe(200);
    const board = (await response.json()) as {
      data: {
        units: Array<{
          rooms: Array<{ roomId: string; boardStatus: string }>;
        }>;
      };
    };
    return board.data.units
      .flatMap((unit) => unit.rooms)
      .find((room) => room.roomId === e2eFixture.roomId)?.boardStatus;
  };

  expect(await readBoardStatus()).toBe("MAINTENANCE");
  const resolve = await request.patch(
    `${apiPrefix}/maintenance-blocks/${block.data.id}`,
    {
      headers: adminHeaders,
      data: {
        status: "RESOLVED",
        resolutionNote: "Synthetic maintenance completed",
      },
    },
  );
  expect(resolve.status()).toBe(200);
  expect(await readBoardStatus()).toBe("AVAILABLE");
});

test("inventory cannot be disabled while a future reservation depends on it", async ({
  request,
}) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const headers = bearerHeaders(admin.accessToken);
  const checkIn = futureDate(120);
  const checkOut = futureDate(121);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);

  const create = await request.post(`${apiPrefix}/public/bookings`, {
    headers: publicHeaders,
    data: {
      bookingOptionId: option.optionId,
      propertyId: option.propertyId,
      from: checkIn,
      to: checkOut,
      guests: 1,
      comfortOption: "NON_AC",
      guestDetails: {
        name: "Inventory Guard Guest",
        email: "inventory-guard@e2e.rently.test",
        contactNumber: "9000000120",
      },
    },
  });
  expect(create.status()).toBe(201);
  const booking = (await create.json()) as {
    data: { id: string };
  };
  const storedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.data.id },
    include: { items: true },
  });
  const reservedRoomId = storedBooking.items.find(
    (item) => item.roomId !== null,
  )?.roomId;
  expect(reservedRoomId).toBeTruthy();

  const blocked = await request.patch(`${apiPrefix}/rooms/${reservedRoomId}`, {
    headers,
    data: { isActive: false },
  });
  expect(blocked.status()).toBe(409);
  await expect(blocked.json()).resolves.toMatchObject({
    error: { code: "INVENTORY_HAS_ACTIVE_COMMITMENTS" },
  });

  const cancel = await request.patch(`${apiPrefix}/bookings/${booking.data.id}`, {
    headers,
    data: {
      status: "CANCELLED",
      note: "Release synthetic inventory before deactivation",
    },
  });
  expect(cancel.status()).toBe(200);

  const deactivate = await request.patch(
    `${apiPrefix}/rooms/${reservedRoomId}`,
    { headers, data: { isActive: false } },
  );
  expect(deactivate.status()).toBe(200);
  const reactivate = await request.patch(
    `${apiPrefix}/rooms/${reservedRoomId}`,
    { headers, data: { isActive: true } },
  );
  expect(reactivate.status()).toBe(200);
});
