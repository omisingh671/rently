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

test("public commercial quotes persist an immutable snapshot and appear in dashboard leads", async ({
  request,
}) => {
  const option = await getRoomAvailabilityOption(
    request,
    futureDate(180),
    futureDate(187),
  );
  const create = await request.post(`${apiPrefix}/public/quote-requests`, {
    headers: publicHeaders,
    data: {
      bookingOptionId: option.optionId,
      propertyId: option.propertyId,
      from: futureDate(180),
      to: futureDate(187),
      guests: 1,
      comfortOption: "NON_AC",
      guestName: "Corporate Quote Guest",
      guestEmail: "corporate-quote@e2e.rently.test",
      guestContactNumber: "9000000180",
      companyName: "E2E Quote Company",
      notes: "Seven-night serviced apartment requirement",
    },
  });
  expect(create.status()).toBe(201);
  const created = (await create.json()) as {
    data: { id: string; expiresAt: string; quote: { totalAmount: number } };
  };
  expect(created.data.quote.totalAmount).toBeGreaterThan(0);

  const stored = await prisma.quoteRequest.findUniqueOrThrow({
    where: { id: created.data.id },
    include: { history: true },
  });
  expect(stored.quoteSnapshot).not.toBeNull();
  expect(stored.companyName).toBe("E2E Quote Company");
  expect(stored.history).toHaveLength(1);
  expect(stored.expiresAt?.toISOString()).toBe(created.data.expiresAt);

  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const dashboard = await request.get(
    `${apiPrefix}/properties/${e2eFixture.property.id}/quotes`,
    { headers: bearerHeaders(manager.accessToken) },
  );
  expect(dashboard.status()).toBe(200);
  const body = (await dashboard.json()) as {
    data: { items: Array<{ id: string; companyName: string | null }> };
  };
  expect(body.data.items).toContainEqual(
    expect.objectContaining({ id: created.data.id, companyName: "E2E Quote Company" }),
  );
});

test("company group room hold blocks public sale and supports atomic rooming-list pickup", async ({
  request,
}) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const headers = bearerHeaders(admin.accessToken);
  const checkIn = futureDate(190);
  const checkOut = futureDate(193);

  const companyResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/companies`,
    {
      headers,
      data: {
        legalName: "E2E Corporate Stays Private Limited",
        gstin: "29ABCDE1234F1Z5",
        billingAddress: "Corporate Billing Address, Bengaluru",
        stateCode: "29",
        creditLimit: 100000,
        paymentTermsDays: 30,
      },
    },
  );
  expect(companyResponse.status()).toBe(201);
  const company = (await companyResponse.json()) as { data: { id: string } };

  const groupResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    {
      headers,
      data: {
        companyId: company.data.id,
        name: "E2E Corporate Project Team",
        checkIn,
        checkOut,
        expectedRooms: 1,
        expectedGuests: 1,
        releaseDate: futureDate(189),
      },
    },
  );
  expect(groupResponse.status()).toBe(201);
  const group = (await groupResponse.json()) as { data: { id: string } };

  const confirmGroup = await request.patch(
    `${apiPrefix}/booking-groups/${group.data.id}/status`,
    {
      headers,
      data: {
        status: "CONFIRMED",
        reason: "Corporate contract approved for room pickup",
      },
    },
  );
  expect(confirmGroup.status()).toBe(200);

  const holdResponse = await request.post(
    `${apiPrefix}/booking-groups/${group.data.id}/room-blocks`,
    {
      headers,
      data: {
        roomIds: [e2eFixture.upgradeRoomId],
        releaseDate: futureDate(189),
        reason: "Corporate allocation approved by sales",
      },
    },
  );
  expect(holdResponse.status()).toBe(201);
  const held = (await holdResponse.json()) as {
    data: {
      inventoryLocks: Array<{
        roomId: string | null;
        lockToken: string;
        releasedAt: string | null;
      }>;
    };
  };
  const lock = held.data.inventoryLocks.find(
    (item) => item.roomId === e2eFixture.upgradeRoomId && item.releasedAt === null,
  );
  expect(lock).toBeTruthy();

  const availability = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: { checkIn, checkOut, guests: 1, comfortOption: "NON_AC" },
    },
  );
  expect(availability.status()).toBe(200);
  const availabilityBody = (await availability.json()) as {
    data: { options: Array<{ items: Array<{ roomId: string | null }> }> };
  };
  expect(
    availabilityBody.data.options
      .flatMap((option) => option.items)
      .some((item) => item.roomId === e2eFixture.upgradeRoomId),
  ).toBe(false);

  const pickupAvailability = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
    {
      headers,
      data: {
        inventoryLockToken: lock!.lockToken,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(pickupAvailability.status()).toBe(200);
  const pickupAvailabilityBody = (await pickupAvailability.json()) as {
    data: {
      items: Array<{
        bookingOptionId: string;
        roomId: string | null;
        available: boolean;
      }>;
    };
  };
  const heldRoomOption = pickupAvailabilityBody.data.items.find(
    (item) => item.roomId === e2eFixture.upgradeRoomId,
  );
  expect(heldRoomOption).toEqual(
    expect.objectContaining({ available: true }),
  );

  const pickup = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers,
      data: {
        bookingGroupId: group.data.id,
        inventoryLockToken: lock!.lockToken,
        bookingOptionId: heldRoomOption!.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Corporate Rooming List Guest",
        guestEmail: "rooming-list@e2e.rently.test",
        countryCode: "+91",
        contactNumber: "9000000190",
      },
    },
  );
  expect(pickup.status()).toBe(201);
  const picked = (await pickup.json()) as { data: { id: string } };
  const storedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: picked.data.id },
  });
  expect(storedBooking.bookingGroupId).toBe(group.data.id);
  expect(storedBooking.companyId).toBe(company.data.id);
  expect(storedBooking.source).toBe("CORPORATE");
  expect(storedBooking.recipientGstin).toBe("29ABCDE1234F1Z5");
  const released = await prisma.inventoryLock.findFirstOrThrow({
    where: { lockToken: lock!.lockToken },
  });
  expect(released.releasedAt).not.toBeNull();
  expect(released.bookingId).toBe(picked.data.id);

  const prematureCancellation = await request.patch(
    `${apiPrefix}/booking-groups/${group.data.id}/status`,
    {
      headers,
      data: {
        status: "CANCELLED",
        reason: "Attempt to close a group with an active member",
      },
    },
  );
  expect(prematureCancellation.status()).toBe(409);
});

test("commercial endpoints preserve property isolation", async ({ request }) => {
  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const response = await request.post(
    `${apiPrefix}/properties/${e2eFixture.outOfScopeProperty.id}/booking-groups`,
    {
      headers: bearerHeaders(manager.accessToken),
      data: {
        name: "Cross-property group",
        checkIn: futureDate(200),
        checkOut: futureDate(202),
        expectedRooms: 1,
        expectedGuests: 1,
      },
    },
  );
  expect(response.status()).toBe(404);
});
