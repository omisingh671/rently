import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { Response } from "express";

import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { prisma } from "@/db/prisma.js";
import type { DashboardCouponDTO } from "@/modules/coupons/coupons.dto.js";
import * as couponsController from "@/modules/coupons/coupons.controller.js";
import * as couponsService from "@/modules/coupons/coupons.service.js";
import * as bookingsService from "@/modules/bookings/bookings.service.js";
import * as pricingService from "@/modules/pricing/pricing.service.js";
import * as taxesService from "@/modules/taxes/taxes.service.js";
import * as bookingPolicyService from "@/modules/booking-policy/booking-policy.service.js";
import * as paymentsService from "@/modules/payments/payments.service.js";
import * as tenantController from "@/modules/public/tenant/tenant.controller.js";
const publicController = {
  ...tenantController,
};
import {
  BookingStatus,
  ComfortOption,
  AdvancePaymentType,
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
import * as tenantService from "@/modules/public/tenant/tenant.service.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import * as availabilityService from "@/modules/public/availability/availability.service.js";
import * as publicBookingsService from "@/modules/public/bookings/bookings.service.js";
import * as enquiriesService from "@/modules/public/enquiries/enquiries.service.js";

const publicService = {
  ...tenantService,
  ...spacesService,
  ...availabilityService,
  ...publicBookingsService,
  ...enquiriesService,
};

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
      slug: `${testId}-property`,
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

const createScopedBookableProperty = async (input: {
  slug: string;
  name: string;
  city: string;
  price?: number;
}) => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: input.slug,
      name: input.name,
      address: `${input.name} Address`,
      city: input.city,
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: `${input.slug}-101`,
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });
  const room = await prisma.room.create({
    data: {
      unitId: unit.id,
      name: `${input.name} Room`,
      number: "101",
      hasAC: true,
      maxOccupancy: 2,
      status: RoomStatus.AVAILABLE,
    },
  });
  const product = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: `${input.name} Double Room`,
      occupancy: 2,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });
  const pricing =
    input.price === undefined
      ? null
      : await prisma.roomPricing.create({
          data: {
            propertyId: property.id,
            roomId: room.id,
            unitId: unit.id,
            productId: product.id,
            rateType: RateType.NIGHTLY,
            pricingTier: PricingTier.STANDARD,
            minNights: 1,
            taxInclusive: false,
            price: input.price,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
          },
        });

  return { property, pricing, unit, room, product };
};

test("public tenant resolution requires explicit active tenant identity", async () => {
  await assert.rejects(
    () => publicService.getTenantConfig(),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "TENANT_REQUIRED");
      return true;
    },
  );

  await assert.rejects(
    () => publicService.getTenantConfig({ tenantSlug: `${testId}-missing` }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "TENANT_NOT_FOUND");
      return true;
    },
  );

  await assert.rejects(
    () =>
      publicController.getTenantConfig(
        {
          query: {},
          headers: {
            "x-app-name": state.tenantSlug,
            host: "example.test",
          },
        } as unknown as AuthRequest,
        createResponseRecorder<ApiSuccess<unknown>>().response,
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "TENANT_REQUIRED");
      return true;
    },
  );

  const config = await publicService.getTenantConfig({
    tenantSlug: state.tenantSlug,
  });
  assert.equal(config.id, state.tenantId);
});

test("public property slug scopes config, spaces, availability, quotes, and enquiries", async () => {
  const slug = `${testId}-kanpur`;
  const { property, pricing } = await createScopedBookableProperty({
    slug,
    name: `${testId} Kanpur Property`,
    city: "Kanpur",
    price: 3100,
  });

  try {
    const tenantFallbackConfig = await publicService.getTenantConfig({
      tenantSlug: state.tenantSlug,
      propertySlug: `${testId}-property`,
    });
    assert.equal(tenantFallbackConfig.contact.source, "TENANT");
    assert.equal(tenantFallbackConfig.contact.supportEmail, `${testId}@sucasa.test`);

    await prisma.property.update({
      where: { id: property.id },
      data: {
        supportEmail: `${slug}@sucasa.test`,
        supportPhone: "+91 9000000000",
        latitude: 26.4499,
        longitude: 80.3319,
      },
    });

    const config = await publicService.getTenantConfig({
      tenantSlug: state.tenantSlug,
      propertySlug: slug,
    });
    assert.equal(config.selectedProperty?.id, property.id);
    assert.equal(config.contact.source, "PROPERTY");
    assert.equal(config.contact.supportEmail, `${slug}@sucasa.test`);
    assert.deepEqual(
      config.propertyContacts.map((item) => item.id),
      [property.id],
    );

    const tenantWideConfig = await publicService.getTenantConfig({
      tenantSlug: state.tenantSlug,
    });
    assert.ok(
      tenantWideConfig.propertyContacts.some((item) => item.id === property.id),
    );

    const spaces = await publicService.listSpaces({
      tenantSlug: state.tenantSlug,
      propertySlug: slug,
    });
    assert.deepEqual(
      [...new Set(spaces.map((space) => space.propertyId))],
      [property.id],
    );

    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2031-01-10T00:00:00.000Z"),
        checkOut: new Date("2031-01-12T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug, propertySlug: slug },
    );
    assert.equal(availability.available, true);

    const option = availability.options[0];
    assert.ok(option);
    const quote = await publicService.getBookingQuote(
      state.guestOneId,
      {
        bookingType: "SINGLE_TARGET",
        bookingOptionId: option.optionId,
        from: new Date("2031-01-10T00:00:00.000Z"),
        to: new Date("2031-01-12T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug, propertySlug: slug },
    );
    assert.equal(quote.propertyId, property.id);

    await assert.rejects(
      () =>
        publicService.getBookingQuote(
          state.guestOneId,
          {
            bookingType: "SINGLE_TARGET",
            spaceId: state.pricingId,
            from: new Date("2031-01-10T00:00:00.000Z"),
            to: new Date("2031-01-12T00:00:00.000Z"),
            guests: 2,
            comfortOption: ComfortOption.AC,
          },
          { tenantSlug: state.tenantSlug, propertySlug: slug },
        ),
      (error: unknown) =>
        error instanceof HttpError &&
        error.statusCode === 404 &&
        error.code === "SPACE_NOT_FOUND",
    );

    const enquiry = await publicService.createEnquiry({
      tenantId: state.tenantId,
      propertySlug: slug,
      name: "Scoped Guest",
      email: `${slug}-guest@sucasa.test`,
      contactNumber: "+91 9000000001",
      message: "Need details",
    });
    assert.equal(enquiry.propertyId, property.id);

    const citySpaces = await publicService.listSpaces({
      tenantSlug: state.tenantSlug,
      city: "Kanpur",
    });
    assert.deepEqual(
      [...new Set(citySpaces.map((space) => space.propertyId))],
      [property.id],
    );
    assert.ok(pricing);
    assert.equal(pricing.propertyId, property.id);
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("city-scoped booking options stay pinned to the selected property", async () => {
  const slug = `${testId}-city-option-kanpur`;
  const checkIn = new Date("2031-02-10T00:00:00.000Z");
  const checkOut = new Date("2031-02-11T00:00:00.000Z");
  const { property } = await createScopedBookableProperty({
    slug,
    name: `${testId} City Option Kanpur`,
    city: "Kanpur",
    price: 3100,
  });

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn,
        checkOut,
        guests: 2,
        comfortOption: ComfortOption.AC,
        city: "Kanpur",
      },
      { tenantSlug: state.tenantSlug },
    );
    const option = availability.options.find(
      (candidate) => candidate.propertyId === property.id,
    );

    assert.ok(option);

    const optionPayload = {
      bookingType: "SINGLE_TARGET" as const,
      bookingOptionId: option.optionId,
      propertyId: option.propertyId,
      from: checkIn,
      to: checkOut,
      guests: 2,
      comfortOption: ComfortOption.AC,
    };
    const lock = await publicService.createInventoryLock(
      state.guestOneId,
      optionPayload,
      { tenantSlug: state.tenantSlug },
    );

    const quote = await publicService.getBookingQuote(
      state.guestOneId,
      {
        ...optionPayload,
        inventoryLockToken: lock.lockToken,
      },
      { tenantSlug: state.tenantSlug },
    );
    assert.equal(quote.propertyId, property.id);

    await assert.rejects(
      () =>
        publicService.createBookingForUser(
          state.guestOneId,
          {
            ...optionPayload,
            inventoryLockToken: lock.lockToken,
          },
          { tenantSlug: state.tenantSlug },
          { requiredPropertyId: state.propertyId },
        ),
      (error: unknown) => {
        assert.ok(error instanceof HttpError);
        assert.equal(error.statusCode, 422);
        assert.equal(error.code, "BOOKING_PROPERTY_MISMATCH");
        return true;
      },
    );

    const booking = await publicService.createBooking(
      state.guestOneId,
      {
        ...optionPayload,
        inventoryLockToken: lock.lockToken,
      },
      { tenantSlug: state.tenantSlug },
    );
    assert.equal(booking.propertyId, property.id);
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
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

test("public availability excludes unpriced properties in city-scoped results", async () => {
  const city = `${testId} Shared City`;
  const unpriced = await createScopedBookableProperty({
    slug: `${testId}-unpriced-city`,
    name: `${testId} Unpriced City Property`,
    city,
  });
  const priced = await createScopedBookableProperty({
    slug: `${testId}-priced-city`,
    name: `${testId} Priced City Property`,
    city,
    price: 3100,
  });

  const availability = await publicService.checkAvailability(
    {
      checkIn: new Date("2032-01-10T00:00:00.000Z"),
      checkOut: new Date("2032-01-11T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      city,
    },
    { tenantSlug: state.tenantSlug },
  );

  const propertyIds = new Set(
    availability.options.map((option) => option.propertyId),
  );

  assert.equal(availability.available, true);
  assert.equal(propertyIds.has(priced.property.id), true);
  assert.equal(propertyIds.has(unpriced.property.id), false);
  assert.deepEqual([...propertyIds], [priced.property.id]);
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
  assert.ok(availability.options.length <= 12);

  const roomOption = availability.options.find(
    (option) => option.guestSplit === "2 + 2 + 1",
  );

  assert.ok(roomOption);
  assert.equal(roomOption.guestSplit, "2 + 2 + 1");
  assert.equal(roomOption.totalCapacity >= 5, true);

  const publicJson = JSON.stringify(availability);
  assert.equal(publicJson.includes(state.roomId), false);
  assert.equal(publicJson.includes(state.roomTwoId), false);
  assert.equal(publicJson.includes(state.roomThreeId), false);
  assert.equal(publicJson.includes(state.pricingId), false);
});

test("public availability uses full room occupancy for unit capacity", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-unit-occupancy`,
      name: `${testId} Unit Occupancy`,
      address: "Unit Occupancy Address",
      city: "Kanpur Nagar",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: "200",
      floor: 2,
      status: UnitStatus.ACTIVE,
    },
  });
  await prisma.room.createMany({
    data: [
      {
        unitId: unit.id,
        name: "Unit 200 Room A",
        number: "200A",
        hasAC: true,
        maxOccupancy: 3,
        status: RoomStatus.AVAILABLE,
      },
      {
        unitId: unit.id,
        name: "Unit 200 Room B",
        number: "200B",
        hasAC: true,
        maxOccupancy: 3,
        status: RoomStatus.AVAILABLE,
      },
    ],
  });
  const unitProduct = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: `${testId} Six Guest Unit`,
      occupancy: 6,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });
  await prisma.roomPricing.create({
    data: {
      propertyId: property.id,
      unitId: unit.id,
      productId: unitProduct.id,
      rateType: RateType.NIGHTLY,
      pricingTier: PricingTier.STANDARD,
      minNights: 1,
      taxInclusive: false,
      price: 6200,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
    },
  });

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-01-10T00:00:00.000Z"),
        checkOut: new Date("2032-01-11T00:00:00.000Z"),
        guests: 6,
        comfortOption: ComfortOption.AC,
        city: "Kanpur Nagar",
      },
      { tenantSlug: state.tenantSlug },
    );
    const unitOption = availability.options.find(
      (option) => option.title === "Whole Apartment" && option.totalCapacity >= 6,
    );

    assert.ok(unitOption);
    assert.equal(unitOption.guestSplit, "6");
    assert.equal(unitOption.items[0]?.targetType, "UNIT");
    assert.equal(unitOption.items[0]?.pricePerNight, 6200);
    assert.deepEqual(
      unitOption.items[0]?.rooms.map((room) => room.capacity),
      [3, 3],
    );
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability recommends unit plus room using unit pricing", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-unit-room-combo`,
      name: `${testId} Unit Room Combo`,
      address: "Unit Room Combo Address",
      city: "Kanpur Nagar",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const [unit, extraUnit] = await Promise.all([
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "200",
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "201",
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
  ]);
  const [extraRoom] = await Promise.all([
    prisma.room.create({
      data: {
        unitId: extraUnit.id,
        name: "Extra Room",
        number: "201A",
        hasAC: true,
        maxOccupancy: 3,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Unit 200 Room A",
        number: "200A",
        hasAC: true,
        maxOccupancy: 3,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Unit 200 Room B",
        number: "200B",
        hasAC: true,
        maxOccupancy: 3,
        status: RoomStatus.AVAILABLE,
      },
    }),
  ]);
  const [unitProduct, singleProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Six Guest Unit Combo`,
        occupancy: 6,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Single Extra Room`,
        occupancy: 1,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);
  await Promise.all([
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        unitId: unit.id,
        productId: unitProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 6200,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: extraRoom.id,
        unitId: extraUnit.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1600,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-02-10T00:00:00.000Z"),
        checkOut: new Date("2032-02-11T00:00:00.000Z"),
        guests: 7,
        comfortOption: ComfortOption.AC,
        city: "Kanpur Nagar",
      },
      { tenantSlug: state.tenantSlug },
    );
    const comboOption = availability.options.find(
      (option) => option.title === "Whole Apartment + Single Room",
    );

    assert.ok(comboOption);
    assert.equal(comboOption.guestSplit, "6 + 1");
    assert.equal(comboOption.totalCapacity >= 7, true);

    const unitItem = comboOption.items.find(
      (item) => item.targetType === "UNIT",
    );
    const roomItem = comboOption.items.find(
      (item) => item.targetType === "ROOM",
    );

    assert.ok(unitItem);
    assert.ok(roomItem);
    assert.equal(unitItem.pricePerNight, 6200);
    assert.equal(unitItem.capacity, 6);
    assert.equal(roomItem.pricePerNight, 1600);
    assert.equal(roomItem.guestCount, 1);
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability curates one-guest room choices by visible capacity", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-curated-one-guest`,
      name: `${testId} Curated One Guest`,
      address: "Curated One Guest Address",
      city: "Curated One Guest",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const [unitOne, unitTwo, unitThree] = await Promise.all([
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "101",
        floor: 1,
        status: UnitStatus.ACTIVE,
      },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "201",
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "301",
        floor: 3,
        status: UnitStatus.ACTIVE,
      },
    }),
  ]);
  const [singleProduct, doubleProduct, tripleProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Single AC`,
        occupancy: 1,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Double AC`,
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Triple AC`,
        occupancy: 3,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);
  await Promise.all([
    prisma.room.createMany({
      data: [
        {
          unitId: unitOne.id,
          name: "Single Room A",
          number: "101A",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitOne.id,
          name: "Single Room B",
          number: "101B",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitTwo.id,
          name: "Double Room A",
          number: "201A",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitTwo.id,
          name: "Double Room B",
          number: "201B",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitThree.id,
          name: "Triple Room A",
          number: "301A",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
      ],
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1750,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: doubleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: tripleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 3250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-03-10T00:00:00.000Z"),
        checkOut: new Date("2032-03-11T00:00:00.000Z"),
        guests: 1,
        comfortOption: ComfortOption.AC,
        city: "Curated One Guest",
      },
      { tenantSlug: state.tenantSlug },
    );
    const roomOptions = availability.options.filter(
      (option) => option.optionType === "ROOM",
    );

    assert.deepEqual(
      roomOptions.map((option) => option.totalCapacity).sort((a, b) => a - b),
      [1, 2, 3],
    );
    assert.deepEqual(
      roomOptions.map((option) => option.guestSplit),
      ["1", "1", "1"],
    );
    assert.deepEqual(
      roomOptions
        .map(
          (option): [number, number] => [
            option.totalCapacity,
            option.nightlyTotal,
          ],
        )
        .sort(([leftCapacity], [rightCapacity]) => leftCapacity - rightCapacity),
      [
        [1, 1750],
        [2, 2250],
        [3, 3250],
      ],
    );
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability shows single-room and split-room combinations", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-curated-two-guest-single`,
      name: `${testId} Curated Two Guest Single`,
      address: "Curated Two Guest Single Address",
      city: "Curated Two Guest Single",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: "101",
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });
  const [singleProduct, doubleProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Single AC Two Guest`,
        occupancy: 1,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Double AC Two Guest`,
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);
  await Promise.all([
    prisma.room.createMany({
      data: [
        {
          unitId: unit.id,
          name: "Double Room",
          number: "101A",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unit.id,
          name: "Single Room A",
          number: "101B",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unit.id,
          name: "Single Room B",
          number: "101C",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
      ],
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: singleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1750,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: doubleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-04-10T00:00:00.000Z"),
        checkOut: new Date("2032-04-11T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        city: "Curated Two Guest Single",
      },
      { tenantSlug: state.tenantSlug },
    );

    const doubleRoomOption = availability.options.find(
      (option) =>
        option.title === "Double Occupancy Room" &&
        option.guestSplit === "2" &&
        option.totalCapacity === 2,
    );

    assert.ok(doubleRoomOption);
    assert.equal(doubleRoomOption.nightlyTotal, 2250);

    const splitRoomOption = availability.options.find(
      (option) =>
        option.title === "2 Single Rooms" && option.guestSplit === "1 + 1",
    );

    assert.ok(splitRoomOption);
    assert.equal(splitRoomOption.nightlyTotal, 3500);
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability shows unit and two-room combinations for four guests", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-curated-four-guest`,
      name: `${testId} Curated Four Guest`,
      address: "Curated Four Guest Address",
      city: "Curated Four Guest",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const [unitWithRooms, unitForWholeUnit] = await Promise.all([
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "100",
        floor: 1,
        status: UnitStatus.ACTIVE,
      },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "200",
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
  ]);
  const [doubleProduct, unitProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Double AC Four Guest`,
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: `${testId} Curated Unit AC Four Guest`,
        occupancy: 6,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);
  await Promise.all([
    prisma.room.createMany({
      data: [
        {
          unitId: unitWithRooms.id,
          name: "Double Room A",
          number: "100A",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitWithRooms.id,
          name: "Double Room B",
          number: "100B",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitForWholeUnit.id,
          name: "Unit Room A",
          number: "200A",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unitForWholeUnit.id,
          name: "Unit Room B",
          number: "200B",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
      ],
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: doubleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        unitId: unitForWholeUnit.id,
        productId: unitProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 6250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-06-10T00:00:00.000Z"),
        checkOut: new Date("2032-06-11T00:00:00.000Z"),
        guests: 4,
        comfortOption: ComfortOption.AC,
        city: "Curated Four Guest",
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.ok(
      availability.options.some(
        (option) =>
          option.title === "Whole Apartment" &&
          option.guestSplit === "4" &&
          option.totalCapacity === 6,
      ),
    );
    assert.ok(
      availability.options.some(
        (option) =>
          option.title === "2 Double Rooms" &&
          option.guestSplit === "2 + 2" &&
          option.totalCapacity === 4,
      ),
    );
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability shows split rooms when no one room covers guests", async () => {
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-curated-two-guest-split`,
      name: `${testId} Curated Two Guest Split`,
      address: "Curated Two Guest Split Address",
      city: "Curated Two Guest Split",
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: "101",
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });
  const product = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: `${testId} Curated Split Single AC`,
      occupancy: 1,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });
  await Promise.all([
    prisma.room.createMany({
      data: [
        {
          unitId: unit.id,
          name: "Single Room A",
          number: "101A",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: unit.id,
          name: "Single Room B",
          number: "101B",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
      ],
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: product.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 1750,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2032-05-10T00:00:00.000Z"),
        checkOut: new Date("2032-05-11T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        city: "Curated Two Guest Split",
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.ok(
      availability.options.some(
        (option) =>
          option.title === "2 Single Rooms" && option.guestSplit === "1 + 1",
      ),
    );
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("public availability exposes package options and metadata for guest counts one through seven", async () => {
  const city = `${testId} Package Matrix`;
  const property = await prisma.property.create({
    data: {
      tenantId: state.tenantId,
      slug: `${testId}-package-matrix`,
      name: `${testId} Package Matrix`,
      address: "Package Matrix Address",
      city,
      state: "Uttar Pradesh",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });
  const [roomUnit, wholeUnit] = await Promise.all([
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "101",
        floor: 1,
        status: UnitStatus.ACTIVE,
      },
    }),
    prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: "201",
        floor: 2,
        status: UnitStatus.ACTIVE,
      },
    }),
  ]);
  const [singleProduct, doubleProduct, tripleProduct, unitProduct] =
    await Promise.all([
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Matrix Single`,
          occupancy: 1,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Matrix Double`,
          occupancy: 2,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Matrix Triple`,
          occupancy: 3,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Matrix Whole Apartment`,
          occupancy: 6,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
    ]);

  await Promise.all([
    prisma.room.createMany({
      data: [
        {
          unitId: roomUnit.id,
          name: "Triple A",
          number: "101A",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Triple B",
          number: "101B",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Double A",
          number: "101C",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Double B",
          number: "101D",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Double C",
          number: "101E",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Single A",
          number: "101F",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Single B",
          number: "101G",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Single C",
          number: "101H",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: roomUnit.id,
          name: "Single D",
          number: "101I",
          hasAC: true,
          maxOccupancy: 1,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: wholeUnit.id,
          name: "Apartment Room A",
          number: "201A",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
        {
          unitId: wholeUnit.id,
          name: "Apartment Room B",
          number: "201B",
          hasAC: true,
          maxOccupancy: 3,
          status: RoomStatus.AVAILABLE,
        },
      ],
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
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
        productId: doubleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 2250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        productId: tripleProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 3250,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        unitId: wholeUnit.id,
        productId: unitProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        minNights: 1,
        taxInclusive: false,
        price: 6200,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  try {
    const check = (guests: number) =>
      publicService.checkAvailability(
        {
          checkIn: new Date("2033-01-10T00:00:00.000Z"),
          checkOut: new Date("2033-01-11T00:00:00.000Z"),
          guests,
          comfortOption: ComfortOption.AC,
          city,
        },
        { tenantSlug: state.tenantSlug },
      );

    const expectations = [
      {
        guests: 1,
        titles: [
          "Single Occupancy Room",
          "Double Occupancy Room",
          "Triple Occupancy Room",
          "Whole Apartment",
        ],
      },
      {
        guests: 2,
        titles: [
          "Double Occupancy Room",
          "2 Single Rooms",
          "Triple Occupancy Room",
          "Whole Apartment",
        ],
      },
      {
        guests: 3,
        titles: [
          "Triple Occupancy Room",
          "Double Room + Single Room",
          "3 Single Rooms",
          "Whole Apartment",
        ],
      },
      {
        guests: 4,
        titles: [
          "2 Double Rooms",
          "Triple Room + Single Room",
          "Whole Apartment",
          "4 Single Rooms",
        ],
      },
      {
        guests: 5,
        titles: [
          "Triple Room + Double Room",
          "2 Double Rooms + 1 Single Room",
          "Whole Apartment",
        ],
      },
      {
        guests: 6,
        titles: [
          "Whole Apartment",
          "2 Triple Rooms",
          "3 Double Rooms",
          "Triple Room + Double Room + Single Room",
        ],
      },
      {
        guests: 7,
        titles: [
          "Whole Apartment + Single Room",
          "2 Triple Rooms + 1 Single Room",
          "1 Triple Room + 2 Double Rooms",
        ],
      },
    ];

    for (const expectation of expectations) {
      const availability = await check(expectation.guests);
      const titles = new Set(availability.options.map((option) => option.title));

      for (const title of expectation.titles) {
        assert.ok(titles.has(title), `${expectation.guests} guests missing ${title}`);
      }

      assert.ok(availability.options.length <= 8);
      assert.equal(
        new Set(availability.options.map((option) => option.optionId)).size,
        availability.options.length,
      );
      assert.ok(
        availability.options.every(
          (option) =>
            option.requestedGuests === expectation.guests &&
            option.totalCapacity >= expectation.guests &&
            option.spareCapacity === option.totalCapacity - expectation.guests,
        ),
      );
    }

    const fiveGuestAvailability = await check(5);
    const tripleDouble = fiveGuestAvailability.options.find(
      (option) => option.title === "Triple Room + Double Room",
    );
    assert.ok(tripleDouble);
    assert.deepEqual(
      tripleDouble.priceBreakdown.map((item) => [item.label, item.pricePerNight]),
      [
        ["Triple Room", 3250],
        ["Double Room", 2250],
      ],
    );
    assert.equal(tripleDouble.nightlyTotal, 5500);
    assert.equal(tripleDouble.stayTotal, 5500);
    assert.equal(tripleDouble.itemLabel, "2 rooms");
    assert.equal(tripleDouble.includedLabel, "1 Triple Room + 1 Double Room");
  } finally {
    await prisma.property.deleteMany({ where: { id: property.id } });
  }
});

test("city availability labels properties and internal options never mix properties", async () => {
  const city = `${testId} Shared City`;
  const first = await createScopedBookableProperty({
    slug: `${testId}-shared-city-a`,
    name: `${testId} Shared City A`,
    city,
    price: 2100,
  });
  const second = await createScopedBookableProperty({
    slug: `${testId}-shared-city-b`,
    name: `${testId} Shared City B`,
    city,
    price: 2200,
  });

  try {
    const availability = await publicService.checkAvailability(
      {
        checkIn: new Date("2033-02-10T00:00:00.000Z"),
        checkOut: new Date("2033-02-11T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        city,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.deepEqual(
      new Set(availability.options.map((option) => option.propertyId)),
      new Set([first.property.id, second.property.id]),
    );
    assert.ok(
      availability.options.every((option) =>
        option.propertyLabel.includes(city),
      ),
    );

    const internalOptions = await availabilityService.generateAvailabilityOptions(
      {
        checkIn: new Date("2033-02-10T00:00:00.000Z"),
        checkOut: new Date("2033-02-11T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
        city,
      },
      state.tenantId,
      1,
      { city },
    );

    assert.ok(
      internalOptions.every(
        (option) =>
          new Set(option.items.map((item) => item.propertyId)).size === 1,
      ),
    );
  } finally {
    await prisma.property.deleteMany({
      where: { id: { in: [first.property.id, second.property.id] } },
    });
  }
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
    (option) => option.guestSplit === "2 + 2 + 1",
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
  assert.equal(booking.title, roomOption.title);
  assert.equal(booking.totalPrice, roomOption.stayTotal);
  assert.deepEqual(
    booking.items.map((item) => item.guestCount).sort((a, b) => a - b),
    [1, 2, 2],
  );
  assert.deepEqual(
    booking.items.map((item) => item.targetLabel).sort(),
    ["Double Room", "Double Room", "Single Room"],
  );
});

test("dashboard pricing blocks duplicate overlapping price rules", async () => {
  await assert.rejects(
    () =>
      pricingService.createRoomPricing(state.superAdminId, state.propertyId, {
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

test("dashboard walk-in availability scopes unit override pricing to that unit", async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: `${testId} Unit Override Tenant`,
      slug: `${testId}-unit-override`,
      brandName: `${testId} Unit Override Tenant`,
      supportEmail: `${testId}-unit-override@sucasa.test`,
    },
  });
  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      slug: `${testId}-unit-override-property`,
      name: `${testId} Unit Override Property`,
      address: "Unit Override Address",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });

  try {
    const [unit201, unit202] = await Promise.all([
      prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `${testId}-201-override`,
          floor: 2,
          status: UnitStatus.ACTIVE,
        },
      }),
      prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `${testId}-202-override`,
          floor: 2,
          status: UnitStatus.ACTIVE,
        },
      }),
    ]);

    await Promise.all([
      prisma.room.create({
        data: {
          unitId: unit201.id,
          name: "Unit Override Room",
          number: "201-A",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
      }),
      prisma.room.create({
        data: {
          unitId: unit202.id,
          name: "Unit Override Room",
          number: "202-A",
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
      }),
    ]);

    const [singleProduct, unitProduct] = await Promise.all([
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Unit Override Single AC`,
          occupancy: 1,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Unit Override Full Unit AC`,
          occupancy: 2,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
    ]);

    const [singleUnitOverridePricing, fullUnitOverridePricing] =
      await Promise.all([
        prisma.roomPricing.create({
          data: {
            propertyId: property.id,
            unitId: unit201.id,
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
            unitId: unit201.id,
            productId: unitProduct.id,
            rateType: RateType.NIGHTLY,
            pricingTier: PricingTier.STANDARD,
            minNights: 1,
            taxInclusive: false,
            price: 6000,
            validFrom: new Date("2026-01-01T00:00:00.000Z"),
          },
        }),
      ]);

    const propertyWidePricingCount = await prisma.roomPricing.count({
      where: {
        propertyId: property.id,
        roomId: null,
        unitId: null,
      },
    });

    assert.equal(propertyWidePricingCount, 0);

    const result = await bookingsService.checkManualBookingAvailability(
      state.superAdminId,
      property.id,
      {
        from: new Date("2029-03-10T00:00:00.000Z"),
        to: new Date("2029-03-11T00:00:00.000Z"),
        guests: 1,
        comfortOption: ComfortOption.AC,
      },
    );

    const roomOption = result.items.find(
      (item) => item.targetType === "ROOM",
    );
    const unitOption = result.items.find(
      (item) => item.targetType === "UNIT",
    );

    assert.ok(roomOption);
    assert.ok(unitOption);
    assert.equal(roomOption.spaceId, singleUnitOverridePricing.id);
    assert.equal(unitOption.spaceId, fullUnitOverridePricing.id);
    assert.deepEqual(
      result.availableSpaceIds.sort(),
      [singleUnitOverridePricing.id, fullUnitOverridePricing.id].sort(),
    );
  } finally {
    await prisma.property.deleteMany({
      where: { id: property.id },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenant.id },
    });
  }
});

test("dashboard walk-in availability prefers room, then unit, then property pricing", async () => {
  const tenant = await prisma.tenant.create({
    data: {
      name: `${testId} Pricing Precedence Tenant`,
      slug: `${testId}-pricing-precedence`,
      brandName: `${testId} Pricing Precedence Tenant`,
      supportEmail: `${testId}-pricing-precedence@sucasa.test`,
    },
  });
  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      slug: `${testId}-pricing-precedence-property`,
      name: `${testId} Pricing Precedence Property`,
      address: "Pricing Precedence Address",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: state.superAdminId,
    },
  });

  try {
    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: `${testId}-301-precedence`,
        floor: 3,
        status: UnitStatus.ACTIVE,
      },
    });
    const room = await prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Pricing Precedence Room",
        number: "301-A",
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    });
    const [singleProduct, unitProduct] = await Promise.all([
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Pricing Precedence Single AC`,
          occupancy: 1,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
      prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Pricing Precedence Full Unit AC`,
          occupancy: 2,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      }),
    ]);

    const [
      propertyWideSinglePricing,
      unitSingleOverridePricing,
      roomOverridePricing,
      propertyWideUnitPricing,
      unitOverridePricing,
    ] = await Promise.all([
      prisma.roomPricing.create({
        data: {
          propertyId: property.id,
          productId: singleProduct.id,
          rateType: RateType.NIGHTLY,
          pricingTier: PricingTier.STANDARD,
          minNights: 1,
          taxInclusive: false,
          price: 1900,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
      prisma.roomPricing.create({
        data: {
          propertyId: property.id,
          unitId: unit.id,
          productId: singleProduct.id,
          rateType: RateType.NIGHTLY,
          pricingTier: PricingTier.STANDARD,
          minNights: 1,
          taxInclusive: false,
          price: 1700,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
      prisma.roomPricing.create({
        data: {
          propertyId: property.id,
          unitId: unit.id,
          roomId: room.id,
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
          productId: unitProduct.id,
          rateType: RateType.NIGHTLY,
          pricingTier: PricingTier.STANDARD,
          minNights: 1,
          taxInclusive: false,
          price: 7000,
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
          price: 6500,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      }),
    ]);

    const result = await bookingsService.checkManualBookingAvailability(
      state.superAdminId,
      property.id,
      {
        from: new Date("2029-04-10T00:00:00.000Z"),
        to: new Date("2029-04-11T00:00:00.000Z"),
        guests: 1,
        comfortOption: ComfortOption.AC,
      },
    );

    const roomOption = result.items.find(
      (item) => item.targetType === "ROOM",
    );
    const unitOption = result.items.find(
      (item) => item.targetType === "UNIT",
    );

    assert.ok(roomOption);
    assert.ok(unitOption);
    assert.equal(roomOption.spaceId, roomOverridePricing.id);
    assert.equal(roomOption.pricePerNight, "1500");
    assert.notEqual(roomOption.spaceId, unitSingleOverridePricing.id);
    assert.notEqual(roomOption.spaceId, propertyWideSinglePricing.id);
    assert.equal(unitOption.spaceId, unitOverridePricing.id);
    assert.equal(unitOption.pricePerNight, "6500");
    assert.notEqual(unitOption.spaceId, propertyWideUnitPricing.id);
  } finally {
    await prisma.property.deleteMany({
      where: { id: property.id },
    });
    await prisma.tenant.deleteMany({
      where: { id: tenant.id },
    });
  }
});

test("public booking applies coupon and freezes price snapshots", async () => {
  const couponCode = `${testId}-SAVE10`.toUpperCase();

  await couponsService.createCoupon(state.superAdminId, state.propertyId, {
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

  await pricingService.updateRoomPricing(state.superAdminId, state.pricingId, {
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
    await pricingService.updateRoomPricing(
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

  await couponsController.createCoupon(
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
  await couponsController.updateCoupon(
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

  await couponsService.createCoupon(state.superAdminId, state.propertyId, {
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

  await couponsService.createCoupon(state.superAdminId, state.propertyId, {
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

  await couponsService.createCoupon(state.superAdminId, state.propertyId, {
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

test("booking freezes property policy snapshot for future refund previews", async () => {
  await prisma.propertyBookingPolicy.upsert({
    where: { propertyId: state.propertyId },
    create: {
      propertyId: state.propertyId,
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 10,
      tokenRefundable: false,
      checkInTime: "13:30",
      checkOutTime: "10:15",
      cancellationRules: {},
      refundRules: {},
      earlyCheckoutRules: {},
      noShowRules: {},
      guestPolicyText: "Original policy text",
    },
    update: {
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 10,
      tokenRefundable: false,
      checkInTime: "13:30",
      checkOutTime: "10:15",
      guestPolicyText: "Original policy text",
    },
  });

  const booking = await publicService.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-08-15T00:00:00.000Z"),
      to: new Date("2027-08-17T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(booking.upfrontAmount, 10);
  assert.equal(booking.policy.tokenRefundable, false);

  await prisma.propertyBookingPolicy.update({
    where: { propertyId: state.propertyId },
    data: {
      tokenRefundable: true,
      checkInTime: "14:00",
      checkOutTime: "09:30",
      guestPolicyText: "Updated policy text",
    },
  });

  const reloaded = await publicService.getBookingById(
    state.guestOneId,
    booking.id,
  );
  assert.equal(reloaded.policy.tokenRefundable, false);
  assert.equal(reloaded.policy.guestPolicyText, "Original policy text");
  assert.equal(reloaded.policy.checkInTime, "14:00");
  assert.equal(reloaded.policy.checkOutTime, "09:30");

  await prisma.propertyBookingPolicy.update({
    where: { propertyId: state.propertyId },
    data: {
      tokenRefundable: false,
      checkInTime: "12:00",
      checkOutTime: "11:00",
      guestPolicyText:
        "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.",
    },
  });
});

test("public quote reflects saved dashboard booking policy for new bookings", async () => {
  const defaultGuestPolicyText =
    "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.";

  try {
    await bookingPolicyService.updateBookingPolicy(
      state.superAdminId,
      state.propertyId,
      {
        advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
        advancePaymentValue: 5,
        tokenRefundable: true,
        checkInTime: "13:00",
        checkOutTime: "10:00",
        cancellationRules: {
          guestCancellationAllowed: true,
          allowedStatuses: ["PENDING", "CONFIRMED"],
          beforeCheckInOnly: true,
        },
        refundRules: {
          tokenRefundable: true,
          manualReviewRequired: true,
        },
        earlyCheckoutRules: {
          refundUnusedNights: false,
          manualReviewRequired: true,
        },
        noShowRules: {
          markAfterCheckInCutoff: true,
          tokenRefundable: true,
        },
        guestPolicyText: "Guest-facing updated policy text",
      },
    );

    const fixedQuote = await publicService.getBookingQuote(
      undefined,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: new Date("2031-01-05T00:00:00.000Z"),
        to: new Date("2031-01-07T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(fixedQuote.policy.advancePaymentValue, 5);
    assert.equal(fixedQuote.upfrontAmount, 5);
    assert.equal(fixedQuote.policy.tokenRefundable, true);
    assert.equal(fixedQuote.policy.checkInTime, "13:00");
    assert.equal(fixedQuote.policy.checkOutTime, "10:00");
    assert.equal(
      fixedQuote.policy.guestPolicyText,
      "Guest-facing updated policy text",
    );

    await bookingPolicyService.updateBookingPolicy(
      state.superAdminId,
      state.propertyId,
      {
        advancePaymentType: AdvancePaymentType.NONE,
        advancePaymentValue: 0,
        tokenRefundable: false,
        checkInTime: "12:00",
        checkOutTime: "11:00",
        cancellationRules: {
          guestCancellationAllowed: true,
          allowedStatuses: ["PENDING", "CONFIRMED"],
          beforeCheckInOnly: true,
        },
        refundRules: {
          tokenRefundable: false,
          manualReviewRequired: true,
        },
        earlyCheckoutRules: {
          refundUnusedNights: false,
          manualReviewRequired: true,
        },
        noShowRules: {
          markAfterCheckInCutoff: true,
          tokenRefundable: false,
        },
        guestPolicyText: defaultGuestPolicyText,
      },
    );

    const noUpfrontQuote = await publicService.getBookingQuote(
      undefined,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: new Date("2031-01-08T00:00:00.000Z"),
        to: new Date("2031-01-10T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(noUpfrontQuote.policy.advancePaymentType, AdvancePaymentType.NONE);
    assert.equal(noUpfrontQuote.paymentPolicy, "NO_UPFRONT_PAYMENT");
    assert.equal(noUpfrontQuote.upfrontAmount, 0);
  } finally {
    await prisma.propertyBookingPolicy.upsert({
      where: { propertyId: state.propertyId },
      create: {
        propertyId: state.propertyId,
        advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
        advancePaymentValue: 10,
        tokenRefundable: false,
        checkInTime: "12:00",
        checkOutTime: "11:00",
        cancellationRules: {
          guestCancellationAllowed: true,
          allowedStatuses: ["PENDING", "CONFIRMED"],
          beforeCheckInOnly: true,
        },
        refundRules: {
          tokenRefundable: false,
          manualReviewRequired: true,
        },
        earlyCheckoutRules: {
          refundUnusedNights: false,
          manualReviewRequired: true,
        },
        noShowRules: {
          markAfterCheckInCutoff: true,
          tokenRefundable: false,
        },
        guestPolicyText: defaultGuestPolicyText,
      },
      update: {
        advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
        advancePaymentValue: 10,
        tokenRefundable: false,
        checkInTime: "12:00",
        checkOutTime: "11:00",
        cancellationRules: {
          guestCancellationAllowed: true,
          allowedStatuses: ["PENDING", "CONFIRMED"],
          beforeCheckInOnly: true,
        },
        refundRules: {
          tokenRefundable: false,
          manualReviewRequired: true,
        },
        earlyCheckoutRules: {
          refundUnusedNights: false,
          manualReviewRequired: true,
        },
        noShowRules: {
          markAfterCheckInCutoff: true,
          tokenRefundable: false,
        },
        guestPolicyText: defaultGuestPolicyText,
      },
    });
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

  await couponsService.createCoupon(state.superAdminId, state.propertyId, {
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
  const existingTax = await taxesService.createTax(
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
        taxesService.createTax(state.superAdminId, state.propertyId, {
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
      taxesService.createTax(state.superAdminId, state.propertyId, {
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
      taxesService.createTax(state.superAdminId, state.propertyId, {
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
