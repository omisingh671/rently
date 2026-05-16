import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingStatus,
  ComfortOption,
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
import * as publicService from "@/modules/public/public.service.js";
import * as paymentsService from "@/modules/payments/payments.service.js";
import * as dashboardService from "@/modules/dashboard/dashboard.service.js";

const testId = `payment-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  managerId: string;
  otherManagerId: string;
  guestId: string;
  tenantId: string;
  tenantSlug: string;
  propertyId: string;
  pricingId: string;
  pricingTwoId: string;
};

let state: TestState;

const createBooking = (
  from = new Date("2027-03-10T00:00:00.000Z"),
  to = new Date("2027-03-12T00:00:00.000Z"),
) =>
  publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from,
      to,
      guests: 2,
      comfortOption: ComfortOption.AC,
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

  const manager = await prisma.user.create({
    data: {
      fullName: "Payment Test Manager",
      email: `${testId}-manager@sucasa.test`,
      passwordHash,
      role: UserRole.MANAGER,
      createdByUserId: superAdmin.id,
    },
  });

  const otherManager = await prisma.user.create({
    data: {
      fullName: "Payment Test Other Manager",
      email: `${testId}-other-manager@sucasa.test`,
      passwordHash,
      role: UserRole.MANAGER,
      createdByUserId: superAdmin.id,
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

  await prisma.propertyAssignment.create({
    data: {
      propertyId: property.id,
      userId: manager.id,
      role: PropertyAssignmentRole.MANAGER,
      assignedByUserId: superAdmin.id,
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

  const [singleProduct, product] = await Promise.all([
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
  ]);

  const pricingRates = await Promise.all([
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
        price: 1800,
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
        price: 1700,
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
  const pricing = pricingRates[2];
  const pricingTwo = pricingRates[3];
  if (!pricing || !pricingTwo) {
    throw new Error("Payment test pricing invariant failed");
  }

  state = {
    superAdminId: superAdmin.id,
    managerId: manager.id,
    otherManagerId: otherManager.id,
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
          in: [
            state.guestId,
            state.managerId,
            state.otherManagerId,
            state.superAdminId,
          ],
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
  const booking = await createBooking(
    new Date("2027-03-10T00:00:00.000Z"),
    new Date("2027-03-12T00:00:00.000Z"),
  );
  assert.equal(booking.status, BookingStatus.PENDING);

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-manual-payment`,
  });

  assert.equal(result.payment.status, "SUCCEEDED");
  assert.equal(result.payment.provider, "MANUAL");
  assert.equal(result.payment.purpose, PaymentPurpose.TOKEN);
  assert.equal(result.payment.method, PaymentMethod.MANUAL);
  assert.equal(result.payment.amount, 10);
  assert.equal(result.payment.currency, "INR");
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);
  assert.equal(result.booking.paymentStatus, "PARTIALLY_PAID");
  assert.equal(result.booking.paidAmount, 10);
  assert.equal(result.booking.balanceAmount, 5990);

  const confirmedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });

  assert.equal(confirmedBooking.status, BookingStatus.CONFIRMED);
  assert.equal(confirmedBooking.paymentStatus, "PARTIALLY_PAID");

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
      comfortOption: ComfortOption.AC,
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
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-multi-room-payment`,
  });

  assert.equal(booking.items.length, 2);
  assert.equal(result.payment.amount, 10);
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);
});

test("booking is confirmed without payment when token collection is disabled", async () => {
  await prisma.tenant.update({
    where: { id: state.tenantId },
    data: {
      payAtCheckInEnabled: false,
    },
  });

  try {
    const booking = await publicService.createBooking(
      state.guestId,
      {
        bookingType: "SINGLE_TARGET",
        spaceId: state.pricingId,
        from: new Date("2027-09-10T00:00:00.000Z"),
        to: new Date("2027-09-12T00:00:00.000Z"),
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
      { tenantSlug: state.tenantSlug },
    );

    assert.equal(booking.status, BookingStatus.CONFIRMED);
    assert.equal(booking.paymentPolicy, BookingPaymentPolicy.NO_UPFRONT_PAYMENT);
    assert.equal(booking.upfrontAmount, 0);

    await assert.rejects(
      paymentsService.createManualPayment({
        userId: state.guestId,
        bookingId: booking.id,
        idempotencyKey: `${testId}-disabled-token-payment`,
      }),
      (reason) => {
        assert.ok(reason instanceof HttpError);
        assert.equal(reason.statusCode, 409);
        assert.equal(reason.code, "BOOKING_PAYMENT_NOT_REQUIRED");
        return true;
      },
    );
  } finally {
    await prisma.tenant.update({
      where: { id: state.tenantId },
      data: {
        payAtCheckInEnabled: true,
      },
    });
  }
});

test("dashboard can create a confirmed walk-in booking without payment", async () => {
  const booking = await dashboardService.createManualBooking(
    state.superAdminId,
    state.propertyId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: new Date("2027-08-10T00:00:00.000Z"),
      to: new Date("2027-08-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      guestName: "Walk In Guest",
      guestEmail: `${testId}-walk-in@sucasa.test`,
      countryCode: "+91",
      contactNumber: "9999999999",
      internalNotes: "Created at reception",
    },
  );

  assert.equal(booking.status, BookingStatus.CONFIRMED);
  assert.equal(booking.paymentPolicy, BookingPaymentPolicy.NO_UPFRONT_PAYMENT);
  assert.equal(booking.upfrontAmount, "0");
  assert.equal(booking.guestEmailSnapshot, `${testId}-walk-in@sucasa.test`);
  assert.equal(booking.items.length, 1);
  assert.equal(booking.internalNotes, "Created at reception");
});

test("dashboard availability check marks booked spaces unavailable", async () => {
  await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-10-10T00:00:00.000Z"),
      to: new Date("2027-10-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const result = await dashboardService.checkManualBookingAvailability(
    state.superAdminId,
    state.propertyId,
    {
      spaceIds: [state.pricingId, state.pricingTwoId],
      from: new Date("2027-10-10T00:00:00.000Z"),
      to: new Date("2027-10-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
  );

  const bookedSpace = result.items.find((item) => item.spaceId === state.pricingId);
  const availableSpace = result.items.find(
    (item) => item.spaceId === state.pricingTwoId,
  );

  assert.equal(bookedSpace?.available, false);
  assert.equal(bookedSpace?.reason, "Already booked for selected dates");
  assert.equal(availableSpace?.available, true);
  assert.deepEqual(result.availableSpaceIds, [state.pricingTwoId]);
});

test("manual token payment rejects a second token for one booking", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-05-10T00:00:00.000Z"),
      to: new Date("2027-05-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
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
      assert.equal(error.code, "BOOKING_TOKEN_ALREADY_PAID");
      return true;
    },
  );
});

test("dashboard records remaining balance payment and marks booking paid", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: new Date("2027-05-20T00:00:00.000Z"),
      to: new Date("2027-05-22T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-balance-token`,
  });

  const updated = await dashboardService.recordBookingBalancePayment(
    state.managerId,
    booking.id,
    {
      amount: 5590,
      method: PaymentMethod.CASH,
      note: "Collected at reception",
      paidAt: new Date("2027-05-20T10:00:00.000Z"),
      idempotencyKey: `${testId}-balance-payment`,
    },
  );

  assert.equal(updated.paymentStatus, "PAID");
  assert.equal(updated.paidAmount, "5600");
  assert.equal(updated.balanceAmount, "0");
  assert.equal(updated.payments.length, 2);
  assert.equal(updated.payments[1]?.purpose, PaymentPurpose.BALANCE);
  assert.equal(updated.payments[1]?.method, PaymentMethod.CASH);
});

test("dashboard rejects balance overpayment", async () => {
  const booking = await createBooking(
    new Date("2027-05-24T00:00:00.000Z"),
    new Date("2027-05-26T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-overpayment-token`,
  });

  await assert.rejects(
    () =>
      dashboardService.recordBookingBalancePayment(state.superAdminId, booking.id, {
        amount: 5991,
        method: PaymentMethod.UPI_MANUAL,
        idempotencyKey: `${testId}-overpayment-balance`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "PAYMENT_OVERPAYMENT");
      return true;
    },
  );
});

test("dashboard rejects balance payment for cancelled and no-show bookings", async () => {
  const cancelledBooking = await createBooking(
    new Date("2027-05-28T00:00:00.000Z"),
    new Date("2027-05-30T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: cancelledBooking.id,
    idempotencyKey: `${testId}-cancelled-payment-token`,
  });
  await dashboardService.updateBooking(state.superAdminId, cancelledBooking.id, {
    status: BookingStatus.CANCELLED,
    note: "Guest cancelled before arrival",
  });

  await assert.rejects(
    () =>
      dashboardService.recordBookingBalancePayment(
        state.superAdminId,
        cancelledBooking.id,
        {
          amount: 100,
          method: PaymentMethod.BANK_TRANSFER,
          idempotencyKey: `${testId}-cancelled-balance`,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_CANCELLED");
      return true;
    },
  );

  const noShowBooking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: new Date("2026-01-10T00:00:00.000Z"),
      to: new Date("2026-01-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: noShowBooking.id,
    idempotencyKey: `${testId}-no-show-token`,
  });
  const markedNoShow = await dashboardService.updateBooking(
    state.superAdminId,
    noShowBooking.id,
    {
      status: BookingStatus.NO_SHOW,
      note: "Guest did not arrive after cutoff",
    },
  );

  assert.equal(markedNoShow.status, BookingStatus.NO_SHOW);
  assert.equal(markedNoShow.statusHistory.at(-1)?.toStatus, BookingStatus.NO_SHOW);

  await assert.rejects(
    () =>
      dashboardService.recordBookingBalancePayment(
        state.superAdminId,
        noShowBooking.id,
        {
          amount: 100,
          method: PaymentMethod.CASH,
          idempotencyKey: `${testId}-no-show-balance`,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_NO_SHOW");
      return true;
    },
  );

  const replacementBooking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: new Date("2026-01-10T00:00:00.000Z"),
      to: new Date("2026-01-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  assert.equal(replacementBooking.status, BookingStatus.PENDING);
});

test("dashboard rejects no-show before cutoff eligibility", async () => {
  const booking = await createBooking(
    new Date("2027-06-20T00:00:00.000Z"),
    new Date("2027-06-22T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-early-no-show-token`,
  });

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        status: BookingStatus.NO_SHOW,
        note: "Too early",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "NO_SHOW_NOT_ELIGIBLE");
      return true;
    },
  );
});

test("manager payment actions are property scoped", async () => {
  const booking = await createBooking(
    new Date("2027-06-24T00:00:00.000Z"),
    new Date("2027-06-26T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-rbac-token`,
  });

  await assert.rejects(
    () =>
      dashboardService.recordBookingBalancePayment(
        state.otherManagerId,
        booking.id,
        {
          amount: 100,
          method: PaymentMethod.CASH,
          idempotencyKey: `${testId}-rbac-balance`,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 404);
      assert.equal(error.code, "PROPERTY_NOT_FOUND");
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
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-dashboard-history-payment`,
  });

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        status: BookingStatus.CHECKED_IN,
        note: "Tried check-in before balance collection.",
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "CHECK_IN_BALANCE_DUE");
      return true;
    },
  );

  const updated = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.CHECKED_IN,
      internalNotes: "Guest arrived with verified ID.",
      note: "Manager approved check-in with balance due.",
      allowBalanceDueCheckIn: true,
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
    "Manager approved check-in with balance due.",
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
      comfortOption: ComfortOption.AC,
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
