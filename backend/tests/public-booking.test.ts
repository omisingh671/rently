import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import * as dashboardService from "@/modules/dashboard/dashboard.service.js";
import {
  BookingStatus,
  ComfortOption,
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
  unitId: string;
  roomId: string;
  roomTwoId: string;
  roomThreeId: string;
  productId: string;
  pricingId: string;
  pricingTwoId: string;
  pricingThreeId: string;
  singlePricingId: string;
  singlePricingTwoId: string;
  singlePricingThreeId: string;
  unitPricingId: string;
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

  const [unit, unitTwo] = await Promise.all([
    prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: `${testId}-101`,
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: `${testId}-201`,
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
  ]);

  const [room, roomTwo, roomThree] = await Promise.all([
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Booking Test Room",
        number: "101",
        rent: 2500,
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Booking Test Room",
        number: "102",
        rent: 2500,
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unitTwo.id,
        name: "Booking Test Room",
        number: "201",
        rent: 2200,
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
  ]);

  const [singleProduct, product, unitProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Single Room`,
        occupancy: 1,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Double Room`,
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Full Unit`,
        occupancy: 4,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);

  const [
    singlePricing,
    singlePricingTwo,
    singlePricingThree,
    pricing,
    pricingTwo,
    pricingThree,
    unitPricing,
  ] =
    await Promise.all([
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: room.id,
        unitId: unit.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1600,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomTwo.id,
        unitId: unit.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1500,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomThree.id,
        unitId: unitTwo.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1400,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
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
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomThree.id,
        unitId: unitTwo.id,
        productId: product.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2200,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomTwo.id,
        unitId: unit.id,
        productId: product.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2400,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        unitId: unit.id,
        productId: unitProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 4500,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  state = {
    superAdminId: superAdmin.id,
    guestOneId: guestOne.id,
    guestTwoId: guestTwo.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    propertyId: property.id,
    unitId: unit.id,
    roomId: room.id,
    roomTwoId: roomTwo.id,
    roomThreeId: roomThree.id,
    productId: product.id,
    pricingId: pricing.id,
    pricingTwoId: pricingThree.id,
    pricingThreeId: pricingTwo.id,
    singlePricingId: singlePricing.id,
    singlePricingTwoId: singlePricingTwo.id,
    singlePricingThreeId: singlePricingThree.id,
    unitPricingId: unitPricing.id,
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
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-01-10T00:00:00.000Z"),
      to: new Date("2027-01-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
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
          bookingType: "SINGLE_TARGET",
          spaceId: state.pricingId,
          from: new Date("2027-01-11T00:00:00.000Z"),
          to: new Date("2027-01-13T00:00:00.000Z"),
          guests: 2,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );
});

test("public availability respects pricing stay limits and validity windows", async () => {
  await prisma.roomPricing.updateMany({
    where: {
      id: {
        in: [
          state.pricingId,
          state.pricingTwoId,
          state.pricingThreeId,
          state.unitPricingId,
        ],
      },
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
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(shortStay.available, false);

  await prisma.roomPricing.updateMany({
    where: {
      id: {
        in: [
          state.pricingId,
          state.pricingTwoId,
          state.pricingThreeId,
          state.unitPricingId,
        ],
      },
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
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(outsideValidity.available, false);

  await prisma.roomPricing.updateMany({
    where: {
      id: {
        in: [
          state.pricingId,
          state.pricingTwoId,
          state.pricingThreeId,
          state.unitPricingId,
        ],
      },
    },
    data: {
      minNights: 1,
      validTo: null,
    },
  });
});

test("public availability returns limited public-safe booking options", async () => {
  const availability = await publicService.checkAvailability(
    {
      checkIn: new Date("2029-01-10T00:00:00.000Z"),
      checkOut: new Date("2029-01-12T00:00:00.000Z"),
      guests: 5,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(availability.available, true);
  assert.ok(availability.options.length > 0);
  assert.ok(availability.options.length <= 6);

  const roomOption = availability.options.find(
    (option) => option.title === "3 Rooms",
  );

  assert.ok(roomOption);
  assert.equal(roomOption.guestSplit, "2 + 2 + 1");
  assert.equal(roomOption.totalCapacity >= 5, true);

  const publicJson = JSON.stringify(availability);
  assert.equal(publicJson.includes(state.roomId), false);
  assert.equal(publicJson.includes(state.roomTwoId), false);
  assert.equal(publicJson.includes(state.roomThreeId), false);
  assert.equal(publicJson.includes(state.pricingId), false);
  assert.equal(publicJson.includes("101"), false);
  assert.equal(publicJson.includes("102"), false);
  assert.equal(publicJson.includes("201"), false);
  assert.equal(publicJson.includes("Double Room"), false);
  assert.equal(publicJson.includes("Single Room"), false);
});

test("public booking can reserve a generated option by opaque option id", async () => {
  const availability = await publicService.checkAvailability(
    {
      checkIn: new Date("2029-02-10T00:00:00.000Z"),
      checkOut: new Date("2029-02-12T00:00:00.000Z"),
      guests: 5,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  const roomOption = availability.options.find(
    (option) => option.title === "3 Rooms",
  );

  assert.ok(roomOption);

  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      bookingOptionId: roomOption.optionId,
      from: new Date("2029-02-10T00:00:00.000Z"),
      to: new Date("2029-02-12T00:00:00.000Z"),
      guests: 5,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(booking.bookingType, "MULTI_ROOM");
  assert.equal(booking.guestCount, 5);
  assert.equal(booking.title, "Multi-room stay (3 rooms)");
  assert.equal(booking.totalPrice, roomOption.stayTotal);
  assert.deepEqual(
    booking.items.map((item) => item.guestCount).sort((a, b) => a - b),
    [1, 2, 2],
  );
  assert.deepEqual(
    booking.items.map((item) => item.targetLabel).sort(),
    ["Room 1", "Room 2", "Room 3"],
  );
});

test("dashboard pricing blocks duplicate overlapping price rules", async () => {
  await assert.rejects(
    () =>
      dashboardService.createRoomPricing(state.superAdminId, state.propertyId, {
        productId: state.productId,
        roomId: state.roomId,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2700,
        validFrom: new Date("2026-06-01T00:00:00.000Z"),
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "ROOM_PRICING_OVERLAP");
      return true;
    },
  );
});

test("public booking rejects single room when guest count exceeds capacity", async () => {
  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestOneId,
        {
          bookingType: "SINGLE_TARGET",
          spaceId: state.pricingId,
          from: new Date("2027-08-10T00:00:00.000Z"),
          to: new Date("2027-08-12T00:00:00.000Z"),
          guests: 3,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "INSUFFICIENT_CAPACITY");
      return true;
    },
  );
});

test("public booking rejects comfort option without active price", async () => {
  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestOneId,
        {
          bookingType: "SINGLE_TARGET",
          spaceId: state.pricingId,
          from: new Date("2027-08-20T00:00:00.000Z"),
          to: new Date("2027-08-22T00:00:00.000Z"),
          guests: 2,
          comfortOption: ComfortOption.NON_AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "PRICE_NOT_CONFIGURED");
      return true;
    },
  );
});

test("public multi-room booking combines available rooms for larger groups", async () => {
  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "MULTI_ROOM",
      spaceIds: [state.pricingId, state.pricingTwoId],
      from: new Date("2027-09-10T00:00:00.000Z"),
      to: new Date("2027-09-12T00:00:00.000Z"),
      guests: 3,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(booking.bookingType, "MULTI_ROOM");
  assert.equal(booking.guestCount, 3);
  assert.equal(booking.comfortOption, ComfortOption.AC);
  assert.equal(booking.items.length, 2);
  assert.deepEqual(
    booking.items.map((item) => item.guestCount).sort((a, b) => a - b),
    [1, 2],
  );
  assert.equal(booking.totalPrice, 8000);
});

test("public multi-room booking rejects duplicate or insufficient selections", async () => {
  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestOneId,
        {
          bookingType: "MULTI_ROOM",
          spaceIds: [state.pricingId, state.pricingId],
          from: new Date("2027-10-10T00:00:00.000Z"),
          to: new Date("2027-10-12T00:00:00.000Z"),
          guests: 3,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "DUPLICATE_BOOKING_SPACE");
      return true;
    },
  );

  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestOneId,
        {
          bookingType: "MULTI_ROOM",
          spaceIds: [state.pricingId, state.pricingTwoId],
          from: new Date("2027-10-20T00:00:00.000Z"),
          to: new Date("2027-10-22T00:00:00.000Z"),
          guests: 5,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "INSUFFICIENT_CAPACITY");
      return true;
    },
  );
});

test("full-unit bookings block child rooms and selected rooms block full unit", async () => {
  await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.unitPricingId,
      from: new Date("2027-11-10T00:00:00.000Z"),
      to: new Date("2027-11-12T00:00:00.000Z"),
      guests: 4,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestTwoId,
        {
          bookingType: "MULTI_ROOM",
          spaceIds: [state.pricingId, state.pricingTwoId],
          from: new Date("2027-11-11T00:00:00.000Z"),
          to: new Date("2027-11-13T00:00:00.000Z"),
          guests: 3,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );

  await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-12-10T00:00:00.000Z"),
      to: new Date("2027-12-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      publicService.createBooking(
        state.guestTwoId,
        {
          bookingType: "SINGLE_TARGET",
          spaceId: state.unitPricingId,
          from: new Date("2027-12-11T00:00:00.000Z"),
          to: new Date("2027-12-13T00:00:00.000Z"),
          guests: 4,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );
});

test("concurrent public booking attempts create only one booking", async () => {
  const checkIn = new Date("2027-02-10T00:00:00.000Z");
  const checkOut = new Date("2027-02-12T00:00:00.000Z");

  const results = await Promise.allSettled([
    publicService.createBooking(
      state.guestOneId,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: checkIn,
        to: checkOut,
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug },
    ),
    publicService.createBooking(
      state.guestTwoId,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: checkIn,
        to: checkOut,
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
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
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2028-01-10T00:00:00.000Z"),
      to: new Date("2028-01-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
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
