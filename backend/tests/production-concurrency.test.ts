import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingRefundRequestStatus,
  ComfortOption,
  MaintenancePriority,
  MaintenanceTargetType,
  PaymentMethod,
  PaymentPurpose,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import * as dashboardBookings from "@/modules/bookings/bookings.service.js";
import * as maintenanceService from "@/modules/maintenance/maintenance.service.js";
import * as paymentsService from "@/modules/payments/payments.service.js";
import * as publicBookings from "@/modules/public/bookings/bookings.service.js";

const testId = `production-concurrency-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  managerOneId: string;
  managerTwoId: string;
  guestOneId: string;
  guestTwoId: string;
  tenantId: string;
  tenantSlug: string;
  propertyId: string;
  unitId: string;
  roomOneId: string;
  roomTwoId: string;
  roomOnePricingId: string;
  roomTwoPricingId: string;
  unitPricingId: string;
};

let state: TestState;

const assertIsolatedDatabase = () => {
  const databaseName = process.env.DATABASE_NAME ?? "";
  if (!/(audit|test)/i.test(databaseName)) {
    throw new Error(
      `Concurrency tests require an isolated audit/test database; received ${databaseName || "<empty>"}`,
    );
  }
};

const range = (day: number) => ({
  from: new Date(Date.UTC(2031, 0, day)),
  to: new Date(Date.UTC(2031, 0, day + 2)),
});

const publicBooking = (
  userId: string,
  pricingId: string,
  dates: ReturnType<typeof range>,
) =>
  publicBookings.createBooking(
    userId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: pricingId,
      from: dates.from,
      to: dates.to,
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

const walkInBooking = (
  actorUserId: string,
  pricingId: string,
  dates: ReturnType<typeof range>,
  suffix: string,
) =>
  dashboardBookings.createManualBooking(actorUserId, state.propertyId, {
    bookingType: "SINGLE_TARGET",
    spaceId: pricingId,
    from: dates.from,
    to: dates.to,
    guests: 2,
    comfortOption: ComfortOption.AC,
    guestName: `Concurrency Walk In ${suffix}`,
    guestEmail: `${testId}-${suffix}@sucasa.test`,
  });

const assertOneWinner = (results: readonly PromiseSettledResult<unknown>[]) => {
  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  assert.equal(
    fulfilled.length,
    1,
    rejected
      .map((result) =>
        result.reason instanceof Error
          ? `${result.reason.name}: ${result.reason.message}`
          : String(result.reason),
      )
      .join(" | "),
  );
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0]?.reason instanceof HttpError ||
      rejected[0]?.reason instanceof Error,
  );
};

before(async () => {
  assertIsolatedDatabase();

  const [superAdmin, managerOne, managerTwo, guestOne, guestTwo] =
    await Promise.all([
      prisma.user.create({
        data: {
          fullName: "Concurrency Super Admin",
          email: `${testId}-super@sucasa.test`,
          passwordHash,
          role: UserRole.SUPER_ADMIN,
        },
      }),
      prisma.user.create({
        data: {
          fullName: "Concurrency Manager One",
          email: `${testId}-manager-one@sucasa.test`,
          passwordHash,
          role: UserRole.MANAGER,
        },
      }),
      prisma.user.create({
        data: {
          fullName: "Concurrency Manager Two",
          email: `${testId}-manager-two@sucasa.test`,
          passwordHash,
          role: UserRole.MANAGER,
        },
      }),
      prisma.user.create({
        data: {
          fullName: "Concurrency Guest One",
          email: `${testId}-guest-one@sucasa.test`,
          passwordHash,
          role: UserRole.GUEST,
        },
      }),
      prisma.user.create({
        data: {
          fullName: "Concurrency Guest Two",
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
      address: "Concurrency Test Address",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });
  await prisma.propertyAssignment.createMany({
    data: [managerOne, managerTwo].map((manager) => ({
      propertyId: property.id,
      userId: manager.id,
      role: PropertyAssignmentRole.MANAGER,
      assignedByUserId: superAdmin.id,
    })),
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: `${testId}-101`,
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });
  const [roomOne, roomTwo] = await Promise.all([
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Concurrency Room One",
        number: "101",
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Concurrency Room Two",
        number: "102",
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
  ]);
  const [roomProduct, unitProduct] = await Promise.all([
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
  const [roomOnePricing, roomTwoPricing, unitPricing] = await Promise.all([
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomOne.id,
        unitId: unit.id,
        productId: roomProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        price: 2500,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
    prisma.roomPricing.create({
      data: {
        propertyId: property.id,
        roomId: roomTwo.id,
        unitId: unit.id,
        productId: roomProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
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
        price: 4500,
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
      },
    }),
  ]);

  state = {
    superAdminId: superAdmin.id,
    managerOneId: managerOne.id,
    managerTwoId: managerTwo.id,
    guestOneId: guestOne.id,
    guestTwoId: guestTwo.id,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    propertyId: property.id,
    unitId: unit.id,
    roomOneId: roomOne.id,
    roomTwoId: roomTwo.id,
    roomOnePricingId: roomOnePricing.id,
    roomTwoPricingId: roomTwoPricing.id,
    unitPricingId: unitPricing.id,
  };
});

after(async () => {
  try {
    if (state !== undefined) {
      await prisma.property.deleteMany({ where: { id: state.propertyId } });
      await prisma.user.deleteMany({
        where: { email: { contains: testId } },
      });
      await prisma.tenant.deleteMany({ where: { id: state.tenantId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("public and walk-in booking cannot sell the same room concurrently", async () => {
  const dates = range(2);
  const results = await Promise.allSettled([
    publicBooking(state.guestOneId, state.roomOnePricingId, dates),
    walkInBooking(
      state.managerOneId,
      state.roomOnePricingId,
      dates,
      "public-vs-walk-in",
    ),
  ]);

  assertOneWinner(results);
  assert.equal(
    await prisma.bookingItem.count({
      where: {
        roomId: state.roomOneId,
        booking: { checkIn: dates.from, checkOut: dates.to },
      },
    }),
    1,
  );
});

test("two managers cannot create the same walk-in stay concurrently", async () => {
  const dates = range(6);
  const results = await Promise.allSettled([
    walkInBooking(
      state.managerOneId,
      state.roomOnePricingId,
      dates,
      "booking-manager-one",
    ),
    walkInBooking(
      state.managerTwoId,
      state.roomOnePricingId,
      dates,
      "booking-manager-two",
    ),
  ]);

  assertOneWinner(results);
});

test("room and parent-unit booking cannot overlap concurrently", async () => {
  const dates = range(10);
  const results = await Promise.allSettled([
    publicBooking(state.guestOneId, state.roomOnePricingId, dates),
    publicBooking(state.guestTwoId, state.unitPricingId, dates),
  ]);

  assertOneWinner(results);
  assert.equal(
    await prisma.booking.count({
      where: { propertyId: state.propertyId, checkIn: dates.from, checkOut: dates.to },
    }),
    1,
  );
});

test("walk-in booking and maintenance block cannot both commit", async () => {
  const dates = range(14);
  const results = await Promise.allSettled([
    walkInBooking(
      state.managerOneId,
      state.roomTwoPricingId,
      dates,
      "maintenance-race",
    ),
    maintenanceService.createMaintenanceBlock(
      state.superAdminId,
      state.propertyId,
      {
        targetType: MaintenanceTargetType.ROOM,
        roomId: state.roomTwoId,
        priority: MaintenancePriority.HIGH,
        reason: "Concurrency maintenance test",
        startDate: dates.from,
        endDate: dates.to,
      },
    ),
  ]);

  assertOneWinner(results);
  const [bookingCount, maintenanceCount] = await Promise.all([
    prisma.bookingItem.count({
      where: {
        roomId: state.roomTwoId,
        booking: { checkIn: dates.from, checkOut: dates.to },
      },
    }),
    prisma.maintenanceBlock.count({
      where: {
        roomId: state.roomTwoId,
        startDate: dates.from,
        endDate: dates.to,
      },
    }),
  ]);
  assert.equal(bookingCount + maintenanceCount, 1);
});

test("repeated guest cancellation creates one transition and one audit row", async () => {
  const booking = await publicBooking(
    state.guestOneId,
    state.roomOnePricingId,
    range(18),
  );
  assert.equal(
    booking.remainingPayAtCheckIn,
    booking.totalPrice - booking.upfrontAmount,
  );
  const results = await Promise.allSettled([
    publicBookings.cancelBooking(state.guestOneId, booking.id, "First replay"),
    publicBookings.cancelBooking(state.guestOneId, booking.id, "Second replay"),
  ]);

  assertOneWinner(results);
  assert.equal(
    await prisma.bookingStatusHistory.count({
      where: {
        bookingId: booking.id,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
      },
    }),
    1,
  );
});

test("simultaneous payment replay creates one financial record", async () => {
  const booking = await publicBooking(
    state.guestTwoId,
    state.roomTwoPricingId,
    range(22),
  );
  const idempotencyKey = `${testId}-same-payment-key`;
  const results = await Promise.allSettled([
    paymentsService.createManualPayment({
      userId: state.guestTwoId,
      bookingId: booking.id,
      idempotencyKey,
    }),
    paymentsService.createManualPayment({
      userId: state.guestTwoId,
      bookingId: booking.id,
      idempotencyKey,
    }),
  ]);

  assert.ok(results.some((result) => result.status === "fulfilled"));
  assert.equal(
    await prisma.payment.count({ where: { idempotencyKey } }),
    1,
  );
  assert.equal(
    (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status,
    "CONFIRMED",
  );
});

test("simultaneous guest refund requests create one active request", async () => {
  await prisma.propertyBookingPolicy.update({
    where: { propertyId: state.propertyId },
    data: { tokenRefundable: true },
  });
  const booking = await publicBooking(
    state.guestOneId,
    state.roomOnePricingId,
    range(26),
  );
  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-refund-request-payment`,
  });
  await publicBookings.cancelBooking(
    state.guestOneId,
    booking.id,
    "Concurrency refund request setup",
  );

  const results = await Promise.allSettled([
    publicBookings.createRefundRequest(
      state.guestOneId,
      booking.id,
      "First simultaneous refund request",
    ),
    publicBookings.createRefundRequest(
      state.guestOneId,
      booking.id,
      "Second simultaneous refund request",
    ),
  ]);

  assertOneWinner(results);
  const rejected = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  assert.ok(rejected?.reason instanceof HttpError);
  assert.equal(rejected.reason.code, "REFUND_REQUEST_ALREADY_EXISTS");
  assert.equal(
    await prisma.bookingRefundRequest.count({
      where: {
        bookingId: booking.id,
        status: {
          in: [
            BookingRefundRequestStatus.REQUESTED,
            BookingRefundRequestStatus.IN_REVIEW,
          ],
        },
      },
    }),
    1,
  );
});

test("guest request racing staff fulfilment creates no stale refund work", async () => {
  await prisma.propertyBookingPolicy.update({
    where: { propertyId: state.propertyId },
    data: { tokenRefundable: true },
  });
  const booking = await publicBooking(
    state.guestTwoId,
    state.roomTwoPricingId,
    range(30),
  );
  await paymentsService.createManualPayment({
    userId: state.guestTwoId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-refund-fulfilment-payment`,
  });
  await publicBookings.cancelBooking(
    state.guestTwoId,
    booking.id,
    "Concurrency refund fulfilment setup",
  );
  const requested = await publicBookings.createRefundRequest(
    state.guestTwoId,
    booking.id,
    "Original refund request",
  );
  const requestId = requested.refundRequest?.id;
  assert.ok(requestId);

  const inReview = await dashboardBookings.updateRefundRequest(
    state.superAdminId,
    booking.id,
    requestId,
    { status: BookingRefundRequestStatus.IN_REVIEW },
  );
  const payment = inReview.payments[0];
  const refundableAmount = Number(inReview.refundableAmount);
  assert.ok(payment);
  assert.ok(refundableAmount > 0);

  const results = await Promise.allSettled([
    dashboardBookings.recordBookingRefund(state.superAdminId, booking.id, {
      paymentId: payment.id,
      amount: refundableAmount,
      method: PaymentMethod.MANUAL,
      reason: "Concurrency fulfilment",
      refundRequestId: requestId,
      idempotencyKey: `${testId}-refund-fulfilment`,
    }),
    publicBookings.createRefundRequest(
      state.guestTwoId,
      booking.id,
      "Concurrent replacement request",
    ),
  ]);

  assert.equal(results[0]?.status, "fulfilled");
  assert.equal(results[1]?.status, "rejected");
  assert.equal(
    await prisma.bookingRefundRequest.count({ where: { bookingId: booking.id } }),
    1,
  );
  assert.equal(
    await prisma.bookingRefundRequest.count({
      where: {
        bookingId: booking.id,
        status: {
          in: [
            BookingRefundRequestStatus.REQUESTED,
            BookingRefundRequestStatus.IN_REVIEW,
          ],
        },
      },
    }),
    0,
  );
});

test("simultaneous stay extensions produce one audited charge", async () => {
  const dates = range(34);
  const booking = await publicBooking(
    state.guestOneId,
    state.roomOnePricingId,
    dates,
  );
  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-stay-extension-payment`,
  });
  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: booking.id,
    purpose: PaymentPurpose.BALANCE,
    idempotencyKey: `${testId}-stay-extension-balance-payment`,
  });
  const confirmed = await dashboardBookings.getBookingById(
    state.managerOneId,
    booking.id,
  );
  const newCheckOut = new Date(Date.UTC(2031, 0, 37));
  const preview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    booking.id,
    {
      expectedVersion: confirmed.version,
      newCheckOut,
    },
  );
  assert.equal(preview.extraNights, 1);
  assert.equal(preview.conflicts.length, 0);

  const extension = {
    expectedVersion: confirmed.version,
    newCheckOut,
    pricingFingerprint: preview.pricingFingerprint,
    note: "Concurrent extension approval",
  };
  const results = await Promise.allSettled([
    dashboardBookings.extendStay(state.managerOneId, booking.id, extension),
    dashboardBookings.extendStay(state.managerTwoId, booking.id, extension),
  ]);

  assertOneWinner(results);
  const stored = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  assert.equal(stored.checkOut.toISOString(), newCheckOut.toISOString());
  assert.equal(
    await prisma.bookingFolioCharge.count({
      where: {
        bookingId: booking.id,
        type: "EXTENSION",
        status: "ACTIVE",
      },
    }),
    1,
  );
  assert.equal(
    await prisma.bookingOperationEvent.count({
      where: { bookingId: booking.id, eventType: "STAY_EXTENSION" },
    }),
    1,
  );
  assert.equal(
    await prisma.billingDocument.count({
      where: { bookingId: booking.id, type: "DEBIT_NOTE" },
    }),
    1,
  );
});

test("stay extension detects parent-unit booking conflicts", async () => {
  const originalDates = range(38);
  const original = await publicBooking(
    state.guestOneId,
    state.roomOnePricingId,
    originalDates,
  );
  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: original.id,
    idempotencyKey: `${testId}-stay-extension-conflict-payment`,
  });
  await publicBookings.createBooking(
    state.guestTwoId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.unitPricingId,
      from: originalDates.to,
      to: new Date(Date.UTC(2031, 0, 42)),
      guests: 4,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  const confirmed = await dashboardBookings.getBookingById(
    state.managerOneId,
    original.id,
  );
  const preview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    original.id,
    {
      expectedVersion: confirmed.version,
      newCheckOut: new Date(Date.UTC(2031, 0, 41)),
    },
  );

  assert.ok(preview.conflicts.some((conflict) => conflict.type === "BOOKING"));
  await assert.rejects(
    () =>
      dashboardBookings.extendStay(state.managerOneId, original.id, {
        expectedVersion: confirmed.version,
        newCheckOut: new Date(Date.UTC(2031, 0, 41)),
        pricingFingerprint: preview.pricingFingerprint,
        note: "Must not oversell parent unit",
      }),
    (error: unknown) =>
      error instanceof HttpError && error.code === "STAY_EXTENSION_CONFLICT",
  );
  assert.equal(
    (
      await prisma.booking.findUniqueOrThrow({ where: { id: original.id } })
    ).checkOut.toISOString(),
    originalDates.to.toISOString(),
  );
});

test("stay extension detects maintenance, locks, and stale pricing without side effects", async () => {
  const dates = range(44);
  const booking = await publicBooking(
    state.guestTwoId,
    state.roomTwoPricingId,
    dates,
  );
  await paymentsService.createManualPayment({
    userId: state.guestTwoId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-stay-extension-guard-payment`,
  });
  const confirmed = await dashboardBookings.getBookingById(
    state.managerOneId,
    booking.id,
  );
  const newCheckOut = new Date(dates.to);
  newCheckOut.setUTCDate(newCheckOut.getUTCDate() + 1);
  const maintenance = await maintenanceService.createMaintenanceBlock(
    state.superAdminId,
    state.propertyId,
    {
      targetType: MaintenanceTargetType.ROOM,
      roomId: state.roomTwoId,
      priority: MaintenancePriority.HIGH,
      reason: "Extension maintenance conflict",
      startDate: dates.to,
      endDate: newCheckOut,
    },
  );
  const maintenancePreview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    booking.id,
    {
      expectedVersion: confirmed.version,
      newCheckOut,
    },
  );
  assert.ok(
    maintenancePreview.conflicts.some(
      (conflict) => conflict.type === "MAINTENANCE",
    ),
  );
  await assert.rejects(
    () =>
      dashboardBookings.extendStay(state.managerOneId, booking.id, {
        expectedVersion: confirmed.version,
        newCheckOut,
        pricingFingerprint: maintenancePreview.pricingFingerprint,
        note: "Maintenance must block manager",
      }),
    (error: unknown) =>
      error instanceof HttpError && error.code === "STAY_EXTENSION_CONFLICT",
  );
  await prisma.maintenanceBlock.update({
    where: { id: maintenance.id },
    data: { status: "CANCELLED" },
  });

  const lock = await prisma.inventoryLock.create({
    data: {
      lockToken: `${testId}-extension-lock`,
      propertyId: state.propertyId,
      targetType: "ROOM",
      unitId: state.unitId,
      roomId: state.roomTwoId,
      checkIn: dates.to,
      checkOut: newCheckOut,
      expiresAt: new Date(Date.now() + 60_000),
      createdByUserId: state.managerOneId,
    },
  });
  const lockPreview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    booking.id,
    {
      expectedVersion: confirmed.version,
      newCheckOut,
    },
  );
  assert.ok(
    lockPreview.conflicts.some(
      (conflict) => conflict.type === "INVENTORY_LOCK",
    ),
  );
  await prisma.inventoryLock.update({
    where: { id: lock.id },
    data: { releasedAt: new Date() },
  });

  const clearPreview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    booking.id,
    {
      expectedVersion: confirmed.version,
      newCheckOut,
    },
  );
  assert.equal(clearPreview.conflicts.length, 0);
  await assert.rejects(
    () =>
      dashboardBookings.extendStay(state.managerOneId, booking.id, {
        expectedVersion: confirmed.version,
        newCheckOut,
        pricingFingerprint: "0".repeat(64),
        note: "Reject stale preview",
      }),
    (error: unknown) =>
      error instanceof HttpError && error.code === "PRICING_CHANGED",
  );
  const unchanged = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });
  assert.equal(unchanged.checkOut.toISOString(), dates.to.toISOString());
  assert.equal(
    await prisma.bookingFolioCharge.count({ where: { bookingId: booking.id } }),
    0,
  );
});

test("stay extension preserves whole-unit and multi-room inventory", async () => {
  const unitDates = range(50);
  const unitBooking = await publicBookings.createBooking(
    state.guestOneId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.unitPricingId,
      from: unitDates.from,
      to: unitDates.to,
      guests: 4,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  await paymentsService.createManualPayment({
    userId: state.guestOneId,
    bookingId: unitBooking.id,
    idempotencyKey: `${testId}-unit-extension-payment`,
  });
  const unitBefore = await dashboardBookings.getBookingById(
    state.managerOneId,
    unitBooking.id,
  );
  const unitNewCheckOut = new Date(unitDates.to);
  unitNewCheckOut.setUTCDate(unitNewCheckOut.getUTCDate() + 1);
  const unitPreview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    unitBooking.id,
    {
      expectedVersion: unitBefore.version,
      newCheckOut: unitNewCheckOut,
    },
  );
  const unitExtended = await dashboardBookings.extendStay(
    state.managerOneId,
    unitBooking.id,
    {
      expectedVersion: unitBefore.version,
      newCheckOut: unitNewCheckOut,
      pricingFingerprint: unitPreview.pricingFingerprint,
      note: "Extend whole unit",
    },
  );
  assert.equal(unitExtended.targetType, "UNIT");
  assert.equal(unitExtended.unitId, state.unitId);
  assert.equal(unitExtended.items.length, 1);

  const multiDates = range(54);
  const multiBooking = await publicBookings.createBooking(
    state.guestTwoId,
    {
      bookingType: "MULTI_ROOM",
      spaceIds: [state.roomOnePricingId, state.roomTwoPricingId],
      from: multiDates.from,
      to: multiDates.to,
      guests: 4,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  await paymentsService.createManualPayment({
    userId: state.guestTwoId,
    bookingId: multiBooking.id,
    idempotencyKey: `${testId}-multi-extension-payment`,
  });
  const multiBefore = await dashboardBookings.getBookingById(
    state.managerOneId,
    multiBooking.id,
  );
  const originalItemIds = multiBefore.items.map((item) => item.id).sort();
  const multiNewCheckOut = new Date(multiDates.to);
  multiNewCheckOut.setUTCDate(multiNewCheckOut.getUTCDate() + 1);
  const multiPreview = await dashboardBookings.previewStayExtension(
    state.managerOneId,
    multiBooking.id,
    {
      expectedVersion: multiBefore.version,
      newCheckOut: multiNewCheckOut,
    },
  );
  const multiExtended = await dashboardBookings.extendStay(
    state.managerOneId,
    multiBooking.id,
    {
      expectedVersion: multiBefore.version,
      newCheckOut: multiNewCheckOut,
      pricingFingerprint: multiPreview.pricingFingerprint,
      note: "Extend multi-room stay",
    },
  );
  assert.equal(multiExtended.items.length, 2);
  assert.deepEqual(
    multiExtended.items.map((item) => item.id).sort(),
    originalItemIds,
  );
});
