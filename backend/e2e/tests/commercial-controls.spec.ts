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

  const afterGroupCutoffResponse = await request.post(
    `${apiPrefix}/booking-groups/${group.data.id}/room-blocks`,
    {
      headers,
      data: {
        roomIds: [e2eFixture.upgradeRoomId],
        releaseDate: checkIn,
        reason: "Attempt to hold inventory beyond the group cutoff",
      },
    },
  );
  expect(afterGroupCutoffResponse.status()).toBe(422);
  await expect(afterGroupCutoffResponse.json()).resolves.toMatchObject({
    error: { code: "GROUP_RELEASE_CUTOFF_EXCEEDED" },
  });

  const pastCutoffCreateResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    {
      headers,
      data: {
        name: "E2E Invalid Past Cutoff Group",
        checkIn: futureDate(240),
        checkOut: futureDate(242),
        expectedRooms: 1,
        expectedGuests: 1,
        releaseDate: futureDate(-1),
      },
    },
  );
  expect(pastCutoffCreateResponse.status()).toBe(422);
  await expect(pastCutoffCreateResponse.json()).resolves.toMatchObject({
    error: { code: "INVALID_GROUP_RELEASE_DATE" },
  });

  const expiredCutoffGroup = await prisma.bookingGroup.create({
    data: {
      groupRef: `GRP-E2E-EXPIRED-${Date.now()}`,
      propertyId: e2eFixture.property.id,
      name: "E2E Expired Cutoff Group",
      checkIn: new Date(futureDate(240)),
      checkOut: new Date(futureDate(242)),
      expectedRooms: 1,
      expectedGuests: 1,
      releaseDate: new Date(futureDate(-1)),
      createdByUserId: e2eFixture.users.admin.id,
    },
  });
  const expiredCutoffHoldResponse = await request.post(
    `${apiPrefix}/booking-groups/${expiredCutoffGroup.id}/room-blocks`,
    {
      headers,
      data: {
        roomIds: [e2eFixture.upgradeRoomId],
        releaseDate: futureDate(239),
        reason: "Attempt to hold rooms after the group cutoff passed",
      },
    },
  );
  expect(expiredCutoffHoldResponse.status()).toBe(409);
  await expect(expiredCutoffHoldResponse.json()).resolves.toMatchObject({
    error: { code: "GROUP_RELEASE_CUTOFF_PASSED" },
  });

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
        expiresAt: string;
        releasedAt: string | null;
      }>;
    };
  };
  const lock = held.data.inventoryLocks.find(
    (item) => item.roomId === e2eFixture.upgradeRoomId && item.releasedAt === null,
  );
  expect(lock).toBeTruthy();
  expect(lock?.expiresAt).toBe(new Date(futureDate(189)).toISOString());

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

test("group pickup revalidates the exact held room when equivalent rooms are curated publicly", async ({
  request,
}) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const headers = bearerHeaders(admin.accessToken);
  const roomId = "00000000-0000-4000-8000-000000000033";
  const pricingId = "00000000-0000-4000-8000-000000000053";
  const checkIn = futureDate(245);
  const checkOut = futureDate(247);
  const releaseDate = futureDate(244);

  await prisma.room.create({
    data: {
      id: roomId,
      unitId: e2eFixture.unitId,
      name: "E2E Equivalent Standard Room",
      number: "E2E-R9",
      hasAC: false,
      maxOccupancy: 1,
    },
  });
  await prisma.roomPricing.create({
    data: {
      id: pricingId,
      propertyId: e2eFixture.property.id,
      roomId,
      productId: e2eFixture.productId,
      price: 1500,
      validFrom: new Date("2020-01-01T00:00:00.000Z"),
    },
  });

  const groupResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    {
      headers,
      data: {
        name: "E2E Equivalent Room Pickup Group",
        checkIn,
        checkOut,
        expectedRooms: 1,
        expectedGuests: 1,
        releaseDate,
      },
    },
  );
  expect(groupResponse.status()).toBe(201);
  const group = (await groupResponse.json()) as { data: { id: string } };

  const holdResponse = await request.post(
    `${apiPrefix}/booking-groups/${group.data.id}/room-blocks`,
    {
      headers,
      data: {
        roomIds: [roomId],
        releaseDate,
        reason: "Hold equivalent room for exact pickup regression",
      },
    },
  );
  expect(holdResponse.status()).toBe(201);
  const heldGroup = (await holdResponse.json()) as {
    data: {
      inventoryLocks: Array<{
        lockToken: string;
        roomId: string | null;
        releasedAt: string | null;
      }>;
    };
  };
  const lock = heldGroup.data.inventoryLocks.find(
    (item) => item.roomId === roomId && item.releasedAt === null,
  );
  expect(lock).toBeTruthy();

  const availabilityResponse = await request.post(
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
  expect(availabilityResponse.status()).toBe(200);
  const availability = (await availabilityResponse.json()) as {
    data: {
      items: Array<{
        bookingOptionId: string;
        roomId: string | null;
        available: boolean;
      }>;
    };
  };
  const heldOption = availability.data.items.find(
    (item) => item.roomId === roomId && item.available,
  );
  expect(heldOption).toBeTruthy();

  const pickupResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers,
      data: {
        bookingGroupId: group.data.id,
        inventoryLockToken: lock!.lockToken,
        bookingOptionId: heldOption!.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Equivalent Room Pickup Guest",
        guestEmail: "equivalent-room-pickup@e2e.rently.test",
      },
    },
  );
  expect(pickupResponse.status()).toBe(201);
  const pickedBooking = (await pickupResponse.json()) as {
    data: { id: string };
  };
  const storedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: pickedBooking.data.id },
  });
  expect(storedBooking.bookingGroupId).toBe(group.data.id);
  const releasedLock = await prisma.inventoryLock.findFirstOrThrow({
    where: { lockToken: lock!.lockToken },
  });
  expect(releasedLock.releasedAt).not.toBeNull();
  expect(releasedLock.bookingId).toBe(pickedBooking.data.id);
});

test("company lifecycle and early group-detail management preserve commercial history", async ({
  request,
}) => {
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const headers = bearerHeaders(admin.accessToken);
  const originalCheckIn = futureDate(215);
  const originalCheckOut = futureDate(218);

  const companyResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/companies`,
    {
      headers,
      data: {
        legalName: "E2E Managed Company Private Limited",
        billingAddress: "Original managed billing address",
        contactEmail: "original-managed@e2e.rently.test",
        creditLimit: 250000,
        paymentTermsDays: 30,
      },
    },
  );
  expect(companyResponse.status()).toBe(201);
  const company = (await companyResponse.json()) as { data: { id: string } };

  const editedCompanyResponse = await request.patch(
    `${apiPrefix}/companies/${company.data.id}`,
    {
      headers,
      data: {
        contactEmail: "updated-managed@e2e.rently.test",
        paymentTermsDays: 45,
        reason: "Corporate billing contact was updated",
      },
    },
  );
  expect(editedCompanyResponse.status()).toBe(200);
  expect(await editedCompanyResponse.json()).toMatchObject({
    data: {
      contactEmail: "updated-managed@e2e.rently.test",
      paymentTermsDays: 45,
    },
  });

  const groupResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    {
      headers,
      data: {
        companyId: company.data.id,
        name: "E2E Managed Group Draft",
        checkIn: originalCheckIn,
        checkOut: originalCheckOut,
        expectedRooms: 1,
        expectedGuests: 1,
        releaseDate: futureDate(214),
      },
    },
  );
  expect(groupResponse.status()).toBe(201);
  const group = (await groupResponse.json()) as { data: { id: string } };

  const groupListResponse = await request.get(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    { headers },
  );
  expect(groupListResponse.status()).toBe(200);
  const groupList = (await groupListResponse.json()) as {
    data: Array<Record<string, unknown> & { id: string; heldRoomCount: number }>;
  };
  const groupSummary = groupList.data.find((item) => item.id === group.data.id);
  expect(groupSummary).toMatchObject({ id: group.data.id, heldRoomCount: 0 });
  expect(groupSummary).not.toHaveProperty("bookings");
  expect(groupSummary).not.toHaveProperty("inventoryLocks");
  expect(groupSummary).not.toHaveProperty("folioCharges");

  const updatedCheckIn = futureDate(216);
  const updatedCheckOut = futureDate(219);
  const editedGroupResponse = await request.patch(
    `${apiPrefix}/booking-groups/${group.data.id}`,
    {
      headers,
      data: {
        name: "E2E Managed Group Final",
        checkIn: updatedCheckIn,
        checkOut: updatedCheckOut,
        expectedRooms: 2,
        expectedGuests: 4,
        releaseDate: futureDate(215),
        reason: "Guest and room forecast was finalized",
      },
    },
  );
  expect(editedGroupResponse.status()).toBe(200);
  expect(await editedGroupResponse.json()).toMatchObject({
    data: {
      id: group.data.id,
      name: "E2E Managed Group Final",
      expectedRooms: 2,
      expectedGuests: 4,
    },
  });
  const groupEditAudit = await prisma.propertyAuditEvent.findFirstOrThrow({
    where: {
      entityId: group.data.id,
      entityType: "BOOKING_GROUP",
      action: "UPDATED",
      reason: "Guest and room forecast was finalized",
    },
  });
  expect(groupEditAudit.metadata).toMatchObject({ operation: "DETAILS_UPDATED" });

  const deactivateResponse = await request.patch(
    `${apiPrefix}/companies/${company.data.id}`,
    {
      headers,
      data: {
        isActive: false,
        reason: "Account is not approved for new business",
      },
    },
  );
  expect(deactivateResponse.status()).toBe(200);
  expect(await deactivateResponse.json()).toMatchObject({ data: { isActive: false } });

  const inactiveCompanyGroup = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/booking-groups`,
    {
      headers,
      data: {
        companyId: company.data.id,
        name: "E2E Rejected Inactive Company Group",
        checkIn: futureDate(225),
        checkOut: futureDate(227),
        expectedRooms: 1,
        expectedGuests: 1,
      },
    },
  );
  expect(inactiveCompanyGroup.status()).toBe(404);
  expect(await inactiveCompanyGroup.json()).toMatchObject({
    error: { code: "COMPANY_NOT_FOUND" },
  });

  const preservedGroup = await request.get(
    `${apiPrefix}/booking-groups/${group.data.id}`,
    { headers },
  );
  expect(preservedGroup.status()).toBe(200);
  expect(await preservedGroup.json()).toMatchObject({
    data: {
      id: group.data.id,
      company: { id: company.data.id, isActive: false },
    },
  });

  const reactivateResponse = await request.patch(
    `${apiPrefix}/companies/${company.data.id}`,
    {
      headers,
      data: {
        isActive: true,
        reason: "Account was approved for new business",
      },
    },
  );
  expect(reactivateResponse.status()).toBe(200);

  const holdResponse = await request.post(
    `${apiPrefix}/booking-groups/${group.data.id}/room-blocks`,
    {
      headers,
      data: {
        roomIds: [e2eFixture.upgradeRoomId],
        releaseDate: futureDate(215),
        reason: "Room allotment approved for managed group",
      },
    },
  );
  expect(holdResponse.status()).toBe(201);

  const lockedEditResponse = await request.patch(
    `${apiPrefix}/booking-groups/${group.data.id}`,
    {
      headers,
      data: {
        expectedGuests: 5,
        reason: "Attempt to change group after room hold",
      },
    },
  );
  expect(lockedEditResponse.status()).toBe(409);
  expect(await lockedEditResponse.json()).toMatchObject({
    error: { code: "GROUP_DETAILS_LOCKED" },
  });

  const cancelResponse = await request.patch(
    `${apiPrefix}/booking-groups/${group.data.id}/status`,
    {
      headers,
      data: {
        status: "CANCELLED",
        reason: "Managed group test cleanup completed",
      },
    },
  );
  expect(cancelResponse.status()).toBe(200);
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
