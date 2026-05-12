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
import * as paymentsService from "@/modules/payments/payments.service.js";
import * as dashboardService from "@/modules/dashboard/dashboard.service.js";

const testId = `payment-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  guestId: string;
  tenantId: string;
  tenantSlug: string;
  propertyId: string;
  pricingId: string;
  pricingTwoId: string;
};

let state: TestState;

const createBooking = () =>
  publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-03-10T00:00:00.000Z"),
      to: new Date("2027-03-12T00:00:00.000Z"),
      guests: 2,
    },
    { tenantSlug: state.tenantSlug },
  );

before(async () => {
  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Payment Test Super Admin",
      email: `${testId}-super@sucasa.test`,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const guest = await prisma.user.create({
    data: {
      fullName: "Payment Test Guest",
      email: `${testId}-guest@sucasa.test`,
      passwordHash,
      role: UserRole.GUEST,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: `${testId} Tenant`,
      slug: testId,
      brandName: `${testId} Tenant`,
      defaultCurrency: "INR",
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

  const [room, roomTwo] = await Promise.all([
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Payment Test Room",
        number: "101",
        rent: 3000,
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Payment Test Room",
        number: "102",
        rent: 2800,
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
  ]);

  const product = await prisma.roomProduct.create({
    data: {
      propertyId: property.id,
      name: `${testId} Double Room`,
      occupancy: 2,
      hasAC: true,
      category: RoomProductCategory.NIGHTLY,
    },
  });

  const [pricing, pricingTwo] = await Promise.all([
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
        price: 3000,
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
        price: 2800,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  state = {
    superAdminId: superAdmin.id,
    guestId: guest.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    propertyId: property.id,
    pricingId: pricing.id,
    pricingTwoId: pricingTwo.id,
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
          in: [state.guestId, state.superAdminId],
        },
      },
    });

    await prisma.tenant.deleteMany({
      where: { id: state.tenantId },
    });
  }

  await prisma.$disconnect();
});

test("manual payment confirms a pending booking", async () => {
  const booking = await createBooking();
  assert.equal(booking.status, BookingStatus.PENDING);

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-manual-payment`,
  });

  assert.equal(result.payment.status, "SUCCEEDED");
  assert.equal(result.payment.provider, "MANUAL");
  assert.equal(result.payment.amount, 6000);
  assert.equal(result.payment.currency, "INR");
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);

  const confirmedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });

  assert.equal(confirmedBooking.status, BookingStatus.CONFIRMED);

  const history = await prisma.bookingStatusHistory.findMany({
    where: {
      bookingId: booking.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  assert.equal(history.length, 2);
  assert.equal(history[0]?.fromStatus, null);
  assert.equal(history[0]?.toStatus, BookingStatus.PENDING);
  assert.equal(history[1]?.fromStatus, BookingStatus.PENDING);
  assert.equal(history[1]?.toStatus, BookingStatus.CONFIRMED);
});

test("manual payment is idempotent for the same key", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-04-10T00:00:00.000Z"),
      to: new Date("2027-04-12T00:00:00.000Z"),
      guests: 2,
    },
    { tenantSlug: state.tenantSlug },
  );
  const idempotencyKey = `${testId}-same-key`;

  const first = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey,
  });
  const second = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey,
  });

  assert.equal(second.payment.id, first.payment.id);
  assert.equal(second.booking.status, BookingStatus.CONFIRMED);

  const paymentCount = await prisma.payment.count({
    where: { bookingId: booking.id },
  });

  assert.equal(paymentCount, 1);
});

test("manual payment confirms a multi-room booking", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "MULTI_ROOM",
      spaceIds: [state.pricingId, state.pricingTwoId],
      from: new Date("2027-06-10T00:00:00.000Z"),
      to: new Date("2027-06-12T00:00:00.000Z"),
      guests: 3,
    },
    { tenantSlug: state.tenantSlug },
  );

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-multi-room-payment`,
  });

  assert.equal(booking.items.length, 2);
  assert.equal(result.payment.amount, 11600);
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);
});

test("manual payment rejects a second successful payment for one booking", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-05-10T00:00:00.000Z"),
      to: new Date("2027-05-12T00:00:00.000Z"),
      guests: 2,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-first-key`,
  });

  await assert.rejects(
    () =>
      paymentsService.createManualPayment({
        userId: state.guestId,
        bookingId: booking.id,
        idempotencyKey: `${testId}-second-key`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_ALREADY_PAID");
      return true;
    },
  );
});

test("dashboard booking status updates append audit history and notes", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-07-10T00:00:00.000Z"),
      to: new Date("2027-07-12T00:00:00.000Z"),
      guests: 2,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-dashboard-history-payment`,
  });

  const updated = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.CHECKED_IN,
      internalNotes: "Guest arrived with verified ID.",
      note: "Front desk checked in guest.",
    },
  );

  assert.equal(updated.status, BookingStatus.CHECKED_IN);
  assert.equal(updated.internalNotes, "Guest arrived with verified ID.");
  assert.equal(updated.statusHistory.length, 3);
  assert.equal(
    updated.statusHistory[updated.statusHistory.length - 1]?.fromStatus,
    BookingStatus.CONFIRMED,
  );
  assert.equal(
    updated.statusHistory[updated.statusHistory.length - 1]?.toStatus,
    BookingStatus.CHECKED_IN,
  );
  assert.equal(
    updated.statusHistory[updated.statusHistory.length - 1]?.note,
    "Front desk checked in guest.",
  );
});

test("dashboard booking status update rejects invalid lifecycle jumps", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-07-20T00:00:00.000Z"),
      to: new Date("2027-07-22T00:00:00.000Z"),
      guests: 2,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        status: BookingStatus.CHECKED_OUT,
        note: "Tried to skip check-in.",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "INVALID_BOOKING_STATUS_TRANSITION");
      return true;
    },
  );
});
