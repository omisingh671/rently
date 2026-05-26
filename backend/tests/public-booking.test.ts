import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Response } from "express";

import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { prisma } from "@/db/prisma.js";
import type { DashboardCouponDTO } from "@/modules/dashboard/dashboard.dto.js";
import * as dashboardController from "@/modules/dashboard/dashboard.controller.js";
import * as dashboardService from "@/modules/dashboard/dashboard.service.js";
import * as paymentsService from "@/modules/payments/payments.service.js";
import {
  BookingStatus,
  ComfortOption,
  DiscountType,
  MaintenanceTargetType,
  PricingTier,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
  TaxType,
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

type ApiSuccess<T> = {
  success: true;
  data: T;
};

let state: TestState;

const createResponseRecorder = <T>() => {
  const captured: { statusCode: number; body: T | undefined } = {
    statusCode: 200,
    body: undefined,
  };
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return response;
    },
    json(body: T) {
      captured.body = body;
      return response;
    },
  };

  return {
    response: response as unknown as Response,
    captured,
  };
};

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
        OR: [
          {
            id: {
              in: [state.guestOneId, state.guestTwoId, state.superAdminId],
            },
          },
          {
            email: {
              contains: testId,
            },
          },
        ],
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

test("public booking applies coupon and freezes price snapshots", async () => {
  const couponCode = `${testId}-SAVE10`.toUpperCase();

  await dashboardService.createCoupon(state.superAdminId, state.propertyId, {
    code: couponCode,
    name: "Save 10 percent",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minNights: 2,
    minAmount: 5000,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
  });

  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-08-01T00:00:00.000Z"),
      to: new Date("2027-08-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      couponCode: `${testId}-save10`,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(booking.pricePerNight, 2500);
  assert.equal(booking.totalPrice, 4500);
  assert.equal(booking.discountAmount, 500);
  assert.equal(booking.couponCode, couponCode);
  assert.equal(booking.items[0]?.pricePerNight, 2500);
  assert.equal(booking.items[0]?.totalAmount, 5000);

  const coupon = await prisma.coupon.findFirstOrThrow({
    where: {
      propertyId: state.propertyId,
      code: couponCode,
    },
  });

  assert.equal(coupon.usedCount, 1);

  await dashboardService.updateRoomPricing(state.superAdminId, state.pricingId, {
    price: 9999,
  });

  try {
    const reloaded = await publicService.getBookingById(
      state.guestOneId,
      booking.id,
    );

    assert.equal(reloaded.pricePerNight, 2500);
    assert.equal(reloaded.totalPrice, 4500);
    assert.equal(reloaded.discountAmount, 500);
    assert.equal(reloaded.items[0]?.pricePerNight, 2500);
    assert.equal(reloaded.items[0]?.totalAmount, 5000);
  } finally {
    await dashboardService.updateRoomPricing(
      state.superAdminId,
      state.pricingId,
      {
        price: 2500,
      },
    );
  }
});

test("dashboard coupon controller persists once-per-user flag", async () => {
  const couponCode = `${testId}-CTRL-ONCE`.toUpperCase();
  const createRecorder =
    createResponseRecorder<ApiSuccess<DashboardCouponDTO>>();

  await dashboardController.createCoupon(
    {
      params: { propertyId: state.propertyId },
      body: {
        code: couponCode,
        name: "Controller Once Per User Coupon",
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        minNights: 1,
        validFrom: "2026-01-01T00:00:00.000Z",
        isActive: true,
        oncePerUser: true,
      },
      user: {
        userId: state.superAdminId,
        role: UserRole.SUPER_ADMIN,
      },
    } as unknown as AuthRequest,
    createRecorder.response,
  );

  assert.equal(createRecorder.captured.statusCode, 201);
  assert.equal(createRecorder.captured.body?.data.oncePerUser, true);

  const couponId = createRecorder.captured.body?.data.id;
  assert.ok(couponId);

  const updateRecorder =
    createResponseRecorder<ApiSuccess<DashboardCouponDTO>>();
  await dashboardController.updateCoupon(
    {
      params: { id: couponId },
      body: { oncePerUser: false },
      user: {
        userId: state.superAdminId,
        role: UserRole.SUPER_ADMIN,
      },
    } as unknown as AuthRequest,
    updateRecorder.response,
  );

  assert.equal(updateRecorder.captured.body?.data.oncePerUser, false);
});

test("public booking once-per-user coupon rejects second booking", async () => {
  const couponCode = `${testId}-ONCE`.toUpperCase();

  await dashboardService.createCoupon(state.superAdminId, state.propertyId, {
    code: couponCode,
    name: "Once Per User Coupon",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minNights: 1,
    minAmount: 1000,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    oncePerUser: true,
  });

  const firstBooking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-09-01T00:00:00.000Z"),
      to: new Date("2027-09-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      couponCode: couponCode,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.ok(firstBooking.id);
  assert.equal(firstBooking.couponCode, couponCode);

  // Try applying same coupon on a second booking for the SAME user (guestOneId)
  await assert.rejects(
    publicService.createBooking(
      state.guestOneId,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: new Date("2027-09-05T00:00:00.000Z"),
        to: new Date("2027-09-07T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        couponCode: couponCode,
      },
      { tenantSlug: state.tenantSlug },
    ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "COUPON_ALREADY_USED");
      return true;
    },
  );

  // Try applying same coupon for a DIFFERENT user (guestTwoId) - should succeed
  const secondBooking = await publicService.createBooking(
    state.guestTwoId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-09-05T00:00:00.000Z"),
      to: new Date("2027-09-07T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      couponCode: couponCode,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.ok(secondBooking.id);
  assert.equal(secondBooking.couponCode, couponCode);
});

test("public booking checkout edit updates guest details and coupon totals", async () => {
  const couponCode = `${testId}-EDIT20`.toUpperCase();

  await dashboardService.createCoupon(state.superAdminId, state.propertyId, {
    code: couponCode,
    name: "Edit Checkout Coupon",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 20,
    minNights: 1,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
  });

  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2030-01-01T00:00:00.000Z"),
      to: new Date("2030-01-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const quoted = await publicService.getBookingCheckoutQuote(
    state.guestOneId,
    booking.id,
    { couponCode },
  );
  assert.equal(quoted.couponCode, couponCode);
  assert.equal(quoted.discountAmount, 1000);

  const updated = await publicService.updateBookingCheckout(
    state.guestOneId,
    booking.id,
    {
      guestDetails: {
        name: "Edited Guest",
        email: `${testId}-edited-guest@sucasa.test`,
        contactNumber: "+91-9999999999",
      },
      couponCode,
    },
  );

  assert.equal(updated.guestName, "Edited Guest");
  assert.equal(updated.guestEmail, `${testId}-edited-guest@sucasa.test`);
  assert.equal(updated.guestContactNumber, "+91-9999999999");
  assert.equal(updated.couponCode, couponCode);
  assert.equal(updated.discountAmount, 1000);
  assert.equal(updated.totalPrice, booking.totalPrice - 1000);

  const couponAfterApply = await prisma.coupon.findFirstOrThrow({
    where: {
      propertyId: state.propertyId,
      code: couponCode,
    },
  });
  assert.equal(couponAfterApply.usedCount, 1);

  const withoutCoupon = await publicService.updateBookingCheckout(
    state.guestOneId,
    booking.id,
    {
      guestDetails: {
        name: "Edited Guest",
        email: `${testId}-edited-guest@sucasa.test`,
        contactNumber: "+91-9999999999",
      },
      couponCode: null,
    },
  );

  assert.equal(withoutCoupon.couponCode, null);
  assert.equal(withoutCoupon.discountAmount, 0);
  assert.equal(withoutCoupon.totalPrice, booking.totalPrice);

  const couponAfterRemoval = await prisma.coupon.findFirstOrThrow({
    where: {
      propertyId: state.propertyId,
      code: couponCode,
    },
  });
  assert.equal(couponAfterRemoval.usedCount, 0);
});

test("public booking checkout edit accepts matching guest edit token", async () => {
  const payload = {
    bookingType: "SINGLE_TARGET",
    spaceId: state.pricingTwoId,
    from: new Date("2030-02-01T00:00:00.000Z"),
    to: new Date("2030-02-03T00:00:00.000Z"),
    guests: 2,
    comfortOption: ComfortOption.AC,
  } as const;
  const lock = await publicService.createInventoryLock(undefined, payload, {
    tenantSlug: state.tenantSlug,
  });
  const booking = await publicService.createBooking(
    undefined,
    {
      ...payload,
      inventoryLockToken: lock.lockToken,
      guestDetails: {
        name: "Guest Token User",
        email: `${testId}-guest-token@sucasa.test`,
        contactNumber: "+91-9000000000",
      },
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    publicService.updateBookingCheckout(undefined, booking.id, {
      guestDetails: {
        name: "Guest Token User",
        email: `${testId}-guest-token@sucasa.test`,
        contactNumber: "+91-9000000001",
      },
      couponCode: null,
    }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 403);
      assert.equal(error.code, "BOOKING_EDIT_FORBIDDEN");
      return true;
    },
  );

  const updated = await publicService.updateBookingCheckout(undefined, booking.id, {
    editToken: lock.lockToken,
    guestDetails: {
      name: "Guest Token Updated",
      email: `${testId}-guest-token@sucasa.test`,
      contactNumber: "+91-9000000001",
    },
    couponCode: null,
  });

  assert.equal(updated.guestName, "Guest Token Updated");
  assert.equal(updated.guestContactNumber, "+91-9000000001");
});

test("public booking checkout edit rejects paid booking", async () => {
  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2030-03-01T00:00:00.000Z"),
      to: new Date("2030-03-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-paid-edit-token`,
    amount: booking.upfrontAmount,
  });

  await assert.rejects(
    publicService.updateBookingCheckout(state.guestOneId, booking.id, {
      guestDetails: {
        name: booking.guestName,
        email: booking.guestEmail,
        contactNumber: booking.guestContactNumber ?? "+91-9000000002",
      },
      couponCode: null,
    }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_PAYMENT_STARTED");
      return true;
    },
  );
});

test("public booking checkout edit rejects once-per-user coupon used on another booking", async () => {
  const couponCode = `${testId}-EDIT-ONCE`.toUpperCase();

  await dashboardService.createCoupon(state.superAdminId, state.propertyId, {
    code: couponCode,
    name: "Edit Once Coupon",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minNights: 1,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
    oncePerUser: true,
  });

  await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2030-04-01T00:00:00.000Z"),
      to: new Date("2030-04-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      couponCode,
    },
    { tenantSlug: state.tenantSlug },
  );
  const secondBooking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2030-04-05T00:00:00.000Z"),
      to: new Date("2030-04-07T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    publicService.updateBookingCheckout(state.guestOneId, secondBooking.id, {
      guestDetails: {
        name: secondBooking.guestName,
        email: secondBooking.guestEmail,
        contactNumber: secondBooking.guestContactNumber ?? "+91-9000000003",
      },
      couponCode,
    }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "COUPON_ALREADY_USED");
      return true;
    },
  );
});

test("public final quote applies tax and booking freezes tax breakdown", async () => {
  const tax = await prisma.tax.create({
    data: {
      propertyId: state.propertyId,
      name: "GST",
      rate: 12,
      taxType: TaxType.PERCENTAGE,
      appliesTo: "ROOM",
      isActive: true,
    },
  });

  try {
    const input = {
      bookingType: "SINGLE_TARGET" as const,
      spaceId: state.pricingId,
      from: new Date("2027-08-05T00:00:00.000Z"),
      to: new Date("2027-08-07T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    };
    const quote = await publicService.getBookingQuote(undefined, input, {
      tenantSlug: state.tenantSlug,
    });

    assert.equal(quote.subtotalAmount, 5000);
    assert.equal(quote.discountAmount, 0);
    assert.equal(quote.taxAmount, 600);
    assert.equal(quote.totalAmount, 5600);
    assert.equal(quote.upfrontAmount, 10);
    assert.equal(quote.remainingPayAtCheckIn, 5590);
    assert.equal(quote.taxBreakdown.length, 1);
    assert.equal(quote.taxBreakdown[0]?.name, "GST");
    assert.equal(quote.taxBreakdown[0]?.included, false);

    const booking = await publicService.createBooking(
      state.guestOneId,
      input,
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(booking.subtotalAmount, 5000);
    assert.equal(booking.taxAmount, 600);
    assert.equal(booking.totalPrice, 5600);
    assert.equal(booking.taxBreakdown.length, 1);
    assert.equal(booking.taxBreakdown[0]?.taxId, tax.id);
  } finally {
    await prisma.tax.delete({ where: { id: tax.id } });
  }
});

test("public quote applies one GST slab per booking item", async () => {
  const lowSlab = await prisma.tax.create({
    data: {
      propertyId: state.propertyId,
      name: "GST 5",
      rate: 5,
      taxType: TaxType.PERCENTAGE,
      category: TaxCategory.GST,
      scope: TaxScope.ACCOMMODATION,
      targetType: TaxTargetType.ALL,
      calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
      minTariff: 0,
      maxTariff: 2000,
      appliesTo: "ALL",
      isActive: true,
    },
  });
  const highSlab = await prisma.tax.create({
    data: {
      propertyId: state.propertyId,
      name: "GST 18",
      rate: 18,
      taxType: TaxType.PERCENTAGE,
      category: TaxCategory.GST,
      scope: TaxScope.ACCOMMODATION,
      targetType: TaxTargetType.ALL,
      calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
      minTariff: 2000,
      appliesTo: "ALL",
      isActive: true,
    },
  });

  try {
    const quote = await publicService.getBookingQuote(
      undefined,
      {
        bookingType: "MULTI_ROOM",
        spaceIds: [state.singlePricingId, state.pricingTwoId],
        from: new Date("2027-08-09T00:00:00.000Z"),
        to: new Date("2027-08-10T00:00:00.000Z"),
        guests: 3,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(quote.subtotalAmount, 4000);
    assert.equal(quote.taxAmount, 525);
    assert.equal(quote.totalAmount, 4525);
    assert.equal(quote.items.length, 2);
    assert.deepEqual(
      quote.items.map((item) => item.taxBreakdown[0]?.taxId).sort(),
      [highSlab.id, lowSlab.id].sort(),
    );
    assert.equal(
      quote.items.reduce((total, item) => total + item.taxAmount, 0),
      quote.taxAmount,
    );
  } finally {
    await prisma.tax.deleteMany({
      where: { id: { in: [lowSlab.id, highSlab.id] } },
    });
  }
});

test("public quote applies coupon before GST slab tax", async () => {
  const couponCode = `${testId}-GST10`.toUpperCase();
  const tax = await prisma.tax.create({
    data: {
      propertyId: state.propertyId,
      name: "GST 18",
      rate: 18,
      taxType: TaxType.PERCENTAGE,
      category: TaxCategory.GST,
      scope: TaxScope.ACCOMMODATION,
      targetType: TaxTargetType.ALL,
      calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
      minTariff: 2000,
      appliesTo: "ALL",
      isActive: true,
    },
  });

  await dashboardService.createCoupon(state.superAdminId, state.propertyId, {
    code: couponCode,
    name: "GST Coupon",
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    isActive: true,
  });

  try {
    const quote = await publicService.getBookingQuote(
      state.guestOneId,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: new Date("2027-08-11T00:00:00.000Z"),
        to: new Date("2027-08-13T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        couponCode,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(quote.subtotalAmount, 5000);
    assert.equal(quote.discountAmount, 500);
    assert.equal(quote.taxableAmount, 4500);
    assert.equal(quote.taxAmount, 810);
    assert.equal(quote.totalAmount, 5310);
    assert.equal(quote.taxBreakdown[0]?.taxId, tax.id);
    assert.equal(quote.items[0]?.discountAmount, 500);
    assert.equal(quote.items[0]?.taxableAmount, 4500);
  } finally {
    await prisma.tax.delete({ where: { id: tax.id } });
    await prisma.coupon.deleteMany({
      where: { propertyId: state.propertyId, code: couponCode },
    });
  }
});

test("dashboard rejects overlapping active GST slabs", async () => {
  const existingTax = await dashboardService.createTax(
    state.superAdminId,
    state.propertyId,
    {
      name: "GST 5",
      rate: 5,
      taxType: TaxType.PERCENTAGE,
      category: TaxCategory.GST,
      scope: TaxScope.ACCOMMODATION,
      targetType: TaxTargetType.ALL,
      calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
      minTariff: 0,
      maxTariff: 2000,
      appliesTo: "ALL",
      isActive: true,
    },
  );

  try {
    await assert.rejects(
      () =>
        dashboardService.createTax(state.superAdminId, state.propertyId, {
          name: "GST overlap",
          rate: 12,
          taxType: TaxType.PERCENTAGE,
          category: TaxCategory.GST,
          scope: TaxScope.ACCOMMODATION,
          targetType: TaxTargetType.ALL,
          calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
          minTariff: 1500,
          maxTariff: 3000,
          appliesTo: "ALL",
          isActive: true,
        }),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "TAX_RULE_CONFLICT");
        return true;
      },
    );
  } finally {
    await prisma.tax.delete({ where: { id: existingTax.id } });
  }
});

test("dashboard rejects tariff fields on flat tax rules", async () => {
  await assert.rejects(
    () =>
      dashboardService.createTax(state.superAdminId, state.propertyId, {
        name: "Platform fee",
        rate: 5,
        taxType: TaxType.FIXED,
        category: TaxCategory.GENERIC,
        scope: TaxScope.BOOKING,
        targetType: TaxTargetType.ALL,
        calculationMode: TaxCalculationMode.FLAT,
        minTariff: 0,
        appliesTo: "ALL",
        isActive: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "FLAT_TAX_TARIFF_NOT_ALLOWED");
      return true;
    },
  );
});

test("dashboard rejects slab tax rules without min tariff", async () => {
  await assert.rejects(
    () =>
      dashboardService.createTax(state.superAdminId, state.propertyId, {
        name: "GST missing min",
        rate: 5,
        taxType: TaxType.PERCENTAGE,
        category: TaxCategory.GST,
        scope: TaxScope.ACCOMMODATION,
        targetType: TaxTargetType.ALL,
        calculationMode: TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF,
        appliesTo: "ALL",
        isActive: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "TAX_SLAB_MIN_TARIFF_REQUIRED");
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

test("same unit overlap is rejected inside booking transaction", async () => {
  await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.unitPricingId,
      from: new Date("2028-02-10T00:00:00.000Z"),
      to: new Date("2028-02-12T00:00:00.000Z"),
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
          bookingType: "SINGLE_TARGET",
          spaceId: state.unitPricingId,
          from: new Date("2028-02-11T00:00:00.000Z"),
          to: new Date("2028-02-13T00:00:00.000Z"),
          guests: 4,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );
});

test("maintenance overlap blocks booking and checkout locks", async () => {
  const checkIn = new Date("2028-03-10T00:00:00.000Z");
  const checkOut = new Date("2028-03-12T00:00:00.000Z");
  const block = await prisma.maintenanceBlock.create({
    data: {
      propertyId: state.propertyId,
      roomId: state.roomId,
      targetType: MaintenanceTargetType.ROOM,
      startDate: new Date("2028-03-09T00:00:00.000Z"),
      endDate: new Date("2028-03-11T00:00:00.000Z"),
      reason: "Race test maintenance",
      createdByUserId: state.superAdminId,
    },
  });

  await assert.rejects(
    () =>
      publicService.createInventoryLock(
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
    assertBookingConflict,
  );

  await assert.rejects(
    () =>
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
    assertBookingConflict,
  );

  await prisma.maintenanceBlock.delete({ where: { id: block.id } });
});

test("checkout inventory locks are atomic, expire, and release after booking", async () => {
  const checkIn = new Date("2028-04-10T00:00:00.000Z");
  const checkOut = new Date("2028-04-12T00:00:00.000Z");
  const firstLock = await publicService.createInventoryLock(
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
  );

  assert.equal(firstLock.ttlSeconds, 600);
  assert.ok(new Date(firstLock.expiresAt).getTime() > Date.now());

  await assert.rejects(
    () =>
      publicService.createInventoryLock(
        state.guestTwoId,
        {
          bookingType: "MULTI_ROOM",
          spaceIds: [state.pricingId, state.pricingTwoId],
          from: checkIn,
          to: checkOut,
          guests: 3,
          comfortOption: ComfortOption.AC,
        },
        { tenantSlug: state.tenantSlug },
      ),
    assertBookingConflict,
  );

  const leakedSecondRoomLock = await prisma.inventoryLock.count({
    where: {
      roomId: state.roomTwoId,
      checkIn,
      checkOut,
      releasedAt: null,
    },
  });
  assert.equal(leakedSecondRoomLock, 0);

  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      inventoryLockToken: firstLock.lockToken,
      from: checkIn,
      to: checkOut,
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const releasedLocks = await prisma.inventoryLock.count({
    where: {
      lockToken: firstLock.lockToken,
      bookingId: booking.id,
      releasedAt: { not: null },
    },
  });
  assert.equal(releasedLocks, 1);

  const expiringLock = await publicService.createInventoryLock(
    state.guestTwoId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingThreeId,
      from: checkIn,
      to: checkOut,
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  await prisma.inventoryLock.updateMany({
    where: { lockToken: expiringLock.lockToken },
    data: { expiresAt: new Date("2026-01-01T00:00:00.000Z") },
  });

  const replacementLock = await publicService.createInventoryLock(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingThreeId,
      from: checkIn,
      to: checkOut,
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.notEqual(replacementLock.lockToken, expiringLock.lockToken);
});

test("concurrent public booking attempts rely on retry and create only one booking", async () => {
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
