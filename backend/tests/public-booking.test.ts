import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingStatus,
  PricingTier,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import * as publicService from "@/modules/public/public.service.js";

const testId = `booking-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  guestOneId: string;
  guestTwoId: string;
  tenantId: string;
  tenantSlug: string;
  propertyId: string;
  pricingId: string;
};

let state: TestState;

const assertBookingConflict = (reason: unknown) => {
  assert.ok(reason instanceof HttpError);
  assert.equal(reason.statusCode, 409);
  assert.ok(
    reason.code === "SPACE_NOT_AVAILABLE" || reason.code === "BOOKING_CONFLICT",
  );
  return true;
};

before(async () => {
  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Booking Test Super Admin",
      email: `${testId}-super@sucasa.test`,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const [guestOne, guestTwo] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "Booking Test Guest One",
        email: `${testId}-guest-one@sucasa.test`,
        passwordHash,
        role: UserRole.GUEST,
      },
    }),
    prisma.user.create({
      data: {
        fullName: "Booking Test Guest Two",
        email: `${testId}-guest-two@sucasa.test`,
        passwordHash,
        role: UserRole.GUEST,
      },
    }),
  ]);

  const tenant = await prisma.tenant.create({
    data: {
      name: `${testId} Tenant`,
      slug: testId,
      brandName: `${testId} Tenant`,
      supportEmail: `${testId}@sucasa.test`,
    },
  });

  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: `${testId} Property`,
      address: "Test Address",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });

  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: `${testId}-101`,
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });

  const room = await prisma.room.create({
    data: {
      unitId: unit.id,
      name: "Booking Test Room",
      number: "101",
      rent: 2500,
      hasAC: true,
      maxOccupancy: 2,
      status: RoomStatus.AVAILABLE,
    },
  });

  const product = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: `${testId} Double Room`,
      occupancy: 2,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });

  const pricing = await prisma.roomPricing.create({
    data: {
      propertyId: property.id,
      roomId: room.id,
      unitId: unit.id,
      productId: product.id,
      rateType: RateType.NIGHTLY,
      pricingTier: PricingTier.STANDARD,
      minNights: 1,
      taxInclusive: false,
      price: 2500,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  state = {
    superAdminId: superAdmin.id,
    guestOneId: guestOne.id,
    guestTwoId: guestTwo.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    propertyId: property.id,
    pricingId: pricing.id,
  };
});

after(async () => {
  if (state !== undefined) {
    await prisma.property.deleteMany({
      where: { id: state.propertyId },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [state.guestOneId, state.guestTwoId, state.superAdminId],
        },
      },
    });

    await prisma.tenant.deleteMany({
      where: { id: state.tenantId },
    });
  }

  await prisma.$disconnect();
});

test("public booking creation rejects overlapping dates", async () => {
  const firstBooking = await publicService.createBooking(
    state.guestOneId,
    {
      spaceId: state.pricingId,
      from: new Date("2027-01-10T00:00:00.000Z"),
      to: new Date("2027-01-12T00:00:00.000Z"),
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(firstBooking.totalPrice, 5000);
  assert.match(firstBooking.bookingRef, /^SCH-\d{4}-\d{6}$/);

  const initialHistory = await prisma.bookingStatusHistory.findMany({
    where: {
      bookingId: firstBooking.id,
    },
  });

  assert.equal(initialHistory.length, 1);
  assert.equal(initialHistory[0]?.fromStatus, null);
  assert.equal(initialHistory[0]?.toStatus, "PENDING");

  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestTwoId,
        {
          spaceId: state.pricingId,
          from: new Date("2027-01-11T00:00:00.000Z"),
          to: new Date("2027-01-13T00:00:00.000Z"),
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );
});

test("public availability respects pricing stay limits and validity windows", async () => {
  await prisma.roomPricing.update({
    where: {
      id: state.pricingId,
    },
    data: {
      minNights: 3,
      validTo: null,
    },
  });

  const shortStay = await publicService.checkAvailability(
    {
      checkIn: new Date("2027-06-10T00:00:00.000Z"),
      checkOut: new Date("2027-06-12T00:00:00.000Z"),
      guests: 2,
      occupancyType: "double",
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(shortStay.available, false);

  await prisma.roomPricing.update({
    where: {
      id: state.pricingId,
    },
    data: {
      minNights: 1,
      validTo: new Date("2027-06-11T00:00:00.000Z"),
    },
  });

  const outsideValidity = await publicService.checkAvailability(
    {
      checkIn: new Date("2027-06-10T00:00:00.000Z"),
      checkOut: new Date("2027-06-12T00:00:00.000Z"),
      guests: 2,
      occupancyType: "double",
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(outsideValidity.available, false);

  await prisma.roomPricing.update({
    where: {
      id: state.pricingId,
    },
    data: {
      minNights: 1,
      validTo: null,
    },
  });
});

test("concurrent public booking attempts create only one booking", async () => {
  const checkIn = new Date("2027-02-10T00:00:00.000Z");
  const checkOut = new Date("2027-02-12T00:00:00.000Z");

  const results = await Promise.allSettled([
    publicService.createBooking(
      state.guestOneId,
      { spaceId: state.pricingId, from: checkIn, to: checkOut },
      { tenantSlug: state.tenantSlug },
    ),
    publicService.createBooking(
      state.guestTwoId,
      { spaceId: state.pricingId, from: checkIn, to: checkOut },
      { tenantSlug: state.tenantSlug },
    ),
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assertBookingConflict(rejected[0]?.reason);

  const count = await prisma.booking.count({
    where: {
      propertyId: state.propertyId,
      checkIn,
      checkOut,
    },
  });

  assert.equal(count, 1);
});

test("guest can cancel a pending future booking with audit history", async () => {
  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      spaceId: state.pricingId,
      from: new Date("2028-01-10T00:00:00.000Z"),
      to: new Date("2028-01-12T00:00:00.000Z"),
    },
    { tenantSlug: state.tenantSlug },
  );

  const cancelled = await publicService.cancelBooking(
    state.guestOneId,
    booking.id,
    "Travel plans changed",
  );

  assert.equal(cancelled.status, BookingStatus.CANCELLED);
  assert.equal(cancelled.cancellationReason, "Travel plans changed");
  assert.ok(cancelled.cancelledAt);

  const history = await prisma.bookingStatusHistory.findMany({
    where: {
      bookingId: booking.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  assert.equal(history.length, 2);
  assert.equal(history[1]?.fromStatus, BookingStatus.PENDING);
  assert.equal(history[1]?.toStatus, BookingStatus.CANCELLED);
  assert.equal(history[1]?.actorUserId, state.guestOneId);
  assert.equal(history[1]?.note, "Travel plans changed");
});
