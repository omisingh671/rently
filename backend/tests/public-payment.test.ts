import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingRefundRequestStatus,
  BillingDocumentType,
  BookingStatus,
  ComfortOption,
  AdvancePaymentType,
  MaintenanceTargetType,
  PaymentMethod,
  PaymentRefundStatus,
  PaymentPurpose,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  UnitStatus,
  PaymentStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import * as publicService from "@/modules/public/bookings/bookings.service.js";
import { createInventoryLock } from "@/modules/public/availability/availability.service.js";
import * as paymentsService from "@/modules/payments/payments.service.js";
import * as dashboardService from "@/modules/bookings/bookings.service.js";
import { billingService } from "@/modules/billing/index.js";

const testId = `payment-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

const utcDateOnly = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const setPropertyTokenRefundable = (propertyId: string, tokenRefundable: boolean) =>
  prisma.propertyBookingPolicy.upsert({
    where: { propertyId },
    create: {
      propertyId,
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 10,
      tokenRefundable,
      cancellationRules: {},
      refundRules: { tokenRefundable },
      earlyCheckoutRules: {},
      noShowRules: {},
      guestPolicyText: tokenRefundable
        ? "Token may be refundable after review."
        : "Token is non-refundable.",
    },
    update: {
      tokenRefundable,
      refundRules: { tokenRefundable },
      guestPolicyText: tokenRefundable
        ? "Token may be refundable after review."
        : "Token is non-refundable.",
    },
  });

type TestState = {
  superAdminId: string;
  managerId: string;
  otherManagerId: string;
  guestId: string;
  tenantId: string;
  tenantSlug: string;
  propertyId: string;
  otherPropertyId: string;
  assignmentRoomId: string;
  assignmentRoomTwoId: string;
  otherPropertyRoomId: string;
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
      slug: `${testId}-property`,
      name: `${testId} Property`,
      address: "Test Address",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });

  const otherProperty = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      slug: `${testId}-other-property`,
      name: `${testId} Other Property`,
      address: "Other Test Address",
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

  const otherUnit = await prisma.unit.create({
    data: {
      propertyId: otherProperty.id,
      unitNumber: `${testId}-201`,
      floor: 2,
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

  const [room, roomTwo, assignmentRoom, assignmentRoomTwo, otherPropertyRoom] =
    await Promise.all([
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Payment Test Room",
        number: "101",
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
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Payment Test Reassignment Room",
        number: "103",
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: unit.id,
        name: "Payment Test Reassignment Room",
        number: "104",
        hasAC: true,
        maxOccupancy: 2,
        status: RoomStatus.AVAILABLE,
      },
    }),
    prisma.room.create({
      data: {
        unitId: otherUnit.id,
        name: "Payment Test Other Property Room",
        number: "201",
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
    otherPropertyId: otherProperty.id,
    assignmentRoomId: assignmentRoom.id,
    assignmentRoomTwoId: assignmentRoomTwo.id,
    otherPropertyRoomId: otherPropertyRoom.id,
    pricingId: pricing.id,
    pricingTwoId: pricingTwo.id,
  };
});

after(async () => {
  if (state !== undefined) {
    await prisma.property.deleteMany({
      where: {
        id: {
          in: [state.propertyId, state.otherPropertyId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: testId,
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
  assert.equal(booking.tokenPaymentStatus, "UNPAID");
  assert.equal(booking.tokenPaidAmount, 0);

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

  const publicBooking = await publicService.getBookingById(
    state.guestId,
    booking.id,
  );
  assert.equal(publicBooking.tokenPaymentStatus, "PAID");
  assert.equal(publicBooking.tokenPaidAmount, 10);

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

  const billingDocuments = await prisma.billingDocument.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(billingDocuments.length, 1);
  assert.equal(billingDocuments[0]?.type, BillingDocumentType.RECEIPT);
  assert.equal(billingDocuments[0]?.paymentId, result.payment.id);

  await assert.rejects(
    () => billingService.createInvoiceForBooking(booking.id),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_BALANCE_DUE");
      return true;
    },
  );
});

test("manual balance payment can clear confirmed booking balance", async () => {
  const booking = await createBooking(
    new Date("2027-03-14T00:00:00.000Z"),
    new Date("2027-03-16T00:00:00.000Z"),
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-manual-balance-token`,
  });

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-manual-balance-clear`,
    amount: 5990,
    purpose: PaymentPurpose.BALANCE,
  });

  assert.equal(result.payment.purpose, PaymentPurpose.BALANCE);
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);
  assert.equal(result.booking.paymentStatus, "PAID");
  assert.equal(result.booking.paidAmount, 6000);
  assert.equal(result.booking.balanceAmount, 0);
});

test("billing documents are idempotent and snapshots stay frozen", async () => {
  const booking = await createBooking(
    new Date("2027-03-28T00:00:00.000Z"),
    new Date("2027-03-30T00:00:00.000Z"),
  );
  const payment = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-billing-idempotent-payment`,
    amount: booking.totalPrice,
  });

  const invoice = await billingService.createInvoiceForBooking(booking.id);
  const invoiceAgain = await billingService.createInvoiceForBooking(booking.id);
  const receipt = await billingService.createReceiptForPayment(payment.payment.id);
  const receiptAgain = await billingService.createReceiptForPayment(
    payment.payment.id,
  );

  assert.equal(invoiceAgain.id, invoice.id);
  assert.equal(receiptAgain.id, receipt.id);
  assert.equal(invoice.total, "6000");
  assert.equal(invoice.balance, "0");
  assert.equal(receipt.balance, "0");

  await prisma.booking.update({
    where: { id: booking.id },
    data: { totalAmount: 9999, taxAmount: 999 },
  });

  const frozenInvoice = await prisma.billingDocument.findUniqueOrThrow({
    where: { id: invoice.id },
  });
  assert.equal(frozenInvoice.total.toString(), "6000");
  assert.equal(frozenInvoice.tax.toString(), "0");

  const documentCount = await prisma.billingDocument.count({
    where: { bookingId: booking.id },
  });
  assert.equal(documentCount, 2);
});

test("manager cannot void billing documents", async () => {
  const booking = await createBooking(
    new Date("2027-04-01T00:00:00.000Z"),
    new Date("2027-04-03T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-manager-void-paid`,
    amount: booking.totalPrice,
  });
  const invoice = await billingService.createInvoiceForBooking(booking.id);

  await assert.rejects(
    () =>
      billingService.voidDashboardDocument(
        state.managerId,
        invoice.id,
        "Manager attempt",
      ),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.code === "FORBIDDEN",
  );
});

test("guest billing document access is scoped to own booking", async () => {
  const booking = await createBooking(
    new Date("2027-04-04T00:00:00.000Z"),
    new Date("2027-04-06T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-guest-billing-access`,
  });

  const ownDocuments = await billingService.listPublicBookingDocuments(
    booking.id,
    state.guestId,
    undefined,
  );
  assert.equal(ownDocuments.length, 1);

  await assert.rejects(
    () =>
      billingService.listPublicBookingDocuments(
        booking.id,
        state.otherManagerId,
        undefined,
      ),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.code === "FORBIDDEN",
  );
});

test("anonymous checkout token can read only its booking documents", async () => {
  const lock = await createInventoryLock(
    undefined,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-06-10T00:00:00.000Z"),
      to: new Date("2027-06-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );
  const booking = await publicService.createBooking(
    undefined,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      inventoryLockToken: lock.lockToken,
      from: new Date("2027-06-10T00:00:00.000Z"),
      to: new Date("2027-06-12T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
      guestDetails: {
        name: "Anonymous Billing Guest",
        email: `${testId}-anonymous@sucasa.test`,
        contactNumber: "+919999999999",
      },
    },
    { tenantSlug: state.tenantSlug },
  );
  await paymentsService.createManualPayment({
    bookingId: booking.id,
    idempotencyKey: `${testId}-anonymous-token-docs`,
  });

  const documents = await billingService.listPublicBookingDocuments(
    booking.id,
    undefined,
    lock.lockToken,
  );
  assert.equal(documents.length, 1);

  const otherBooking = await createBooking(
    new Date("2027-06-13T00:00:00.000Z"),
    new Date("2027-06-15T00:00:00.000Z"),
  );
  await assert.rejects(
    () =>
      billingService.listPublicBookingDocuments(
        otherBooking.id,
        undefined,
        lock.lockToken,
      ),
    (error) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.code === "FORBIDDEN",
  );
});

test("concurrent invoice generation does not duplicate document numbers", async () => {
  const booking = await createBooking(
    new Date("2027-04-07T00:00:00.000Z"),
    new Date("2027-04-09T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-concurrent-invoice-paid`,
    amount: booking.totalPrice,
  });

  const [first, second] = await Promise.all([
    billingService.createInvoiceForBooking(booking.id),
    billingService.createInvoiceForBooking(booking.id),
  ]);

  assert.equal(first.id, second.id);

  const documents = await prisma.billingDocument.findMany({
    where: { bookingId: booking.id, type: BillingDocumentType.INVOICE },
  });
  assert.equal(documents.length, 1);
});

test("manual payment can confirm a pending booking with full amount", async () => {
  const booking = await createBooking(
    new Date("2027-03-20T00:00:00.000Z"),
    new Date("2027-03-22T00:00:00.000Z"),
  );

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-full-manual-payment`,
    purpose: PaymentPurpose.FULL_PAYMENT,
  });

  assert.equal(result.payment.status, "SUCCEEDED");
  assert.equal(result.payment.purpose, PaymentPurpose.FULL_PAYMENT);
  assert.equal(result.payment.amount, booking.totalPrice);
  assert.equal(result.booking.status, BookingStatus.CONFIRMED);
  assert.equal(result.booking.paymentStatus, "PAID");
  assert.equal(result.booking.paidAmount, booking.totalPrice);
  assert.equal(result.booking.balanceAmount, 0);

  const confirmedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
  });

  assert.equal(confirmedBooking.status, BookingStatus.CONFIRMED);
  assert.equal(confirmedBooking.paymentStatus, "PAID");

  const billingDocuments = await prisma.billingDocument.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
  });
  assert.equal(billingDocuments.length, 2);
  assert.equal(billingDocuments[0]?.type, BillingDocumentType.INVOICE);
  assert.equal(billingDocuments[0]?.paid.toString(), "6000");
  assert.equal(billingDocuments[0]?.balance.toString(), "0");
  assert.equal(billingDocuments[1]?.type, BillingDocumentType.RECEIPT);
  assert.equal(billingDocuments[1]?.paymentId, result.payment.id);
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
      from: new Date("2027-08-10T00:00:00.000Z"),
      to: new Date("2027-08-12T00:00:00.000Z"),
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
  await prisma.propertyBookingPolicy.upsert({
    where: { propertyId: state.propertyId },
    create: {
      propertyId: state.propertyId,
      advancePaymentType: AdvancePaymentType.NONE,
      advancePaymentValue: 0,
      tokenRefundable: false,
      cancellationRules: {},
      refundRules: {},
      earlyCheckoutRules: {},
      noShowRules: {},
      guestPolicyText: "No upfront payment required.",
    },
    update: {
      advancePaymentType: AdvancePaymentType.NONE,
      advancePaymentValue: 0,
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
    await prisma.propertyBookingPolicy.update({
      where: { propertyId: state.propertyId },
      data: {
        advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
        advancePaymentValue: 10,
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
      from: new Date("2027-11-10T00:00:00.000Z"),
      to: new Date("2027-11-12T00:00:00.000Z"),
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

test("dashboard can create a scoped walk-in booking option beyond tenant-wide option cap", async () => {
  const checkIn = new Date("2027-12-10T00:00:00.000Z");
  const checkOut = new Date("2027-12-11T00:00:00.000Z");
  const cheaperPropertyIds: string[] = [];

  try {
    for (let index = 0; index < 6; index += 1) {
      const property = await prisma.property.create({
        data: {
          tenantId: state.tenantId,
          slug: `${testId}-cheap-option-${index}`,
          name: `${testId} Cheap Option ${index}`,
          address: "Cheap Option Address",
          city: "Hyderabad",
          state: "Telangana",
          status: PropertyStatus.ACTIVE,
          createdByUserId: state.superAdminId,
        },
      });
      cheaperPropertyIds.push(property.id);

      const unit = await prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `${testId}-cheap-${index}`,
          floor: 1,
          status: UnitStatus.ACTIVE,
        },
      });

      const room = await prisma.room.create({
        data: {
          unitId: unit.id,
          name: "Cheap Option Room",
          number: `${index + 1}`,
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
        },
      });

      const product = await prisma.roomProduct.create({
        data: {
          propertyId: property.id,
          name: `${testId} Cheap Option Double ${index}`,
          occupancy: 2,
          hasAC: true,
          category: RoomProductCategory.NIGHTLY,
        },
      });

      await prisma.roomPricing.create({
        data: {
          propertyId: property.id,
          roomId: room.id,
          unitId: unit.id,
          productId: product.id,
          rateType: RateType.NIGHTLY,
          pricingTier: PricingTier.STANDARD,
          minNights: 1,
          taxInclusive: false,
          price: 1000 + index,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
        },
      });
    }

    const availability = await dashboardService.checkManualBookingAvailability(
      state.superAdminId,
      state.propertyId,
      {
        from: checkIn,
        to: checkOut,
        guests: 2,
        comfortOption: ComfortOption.AC,
      },
    );
    const option = availability.items.find((item) => item.available);

    assert.ok(option);

    const booking = await dashboardService.createManualBooking(
      state.superAdminId,
      state.propertyId,
      {
        bookingType: "SINGLE_TARGET",
        bookingOptionId: option.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 2,
        comfortOption: option.comfortOption,
        guestName: "Scoped Walk In Guest",
        guestEmail: `${testId}-scoped-walk-in@sucasa.test`,
      },
    );

    assert.equal(booking.status, BookingStatus.CONFIRMED);
    assert.equal(booking.propertyId, state.propertyId);
    assert.equal(booking.items.length, option.itemCount);
  } finally {
    await prisma.property.deleteMany({
      where: {
        id: {
          in: cheaperPropertyIds,
        },
      },
    });
  }
});

test("dashboard availability check marks booked spaces unavailable", async () => {
  await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-11-20T00:00:00.000Z"),
      to: new Date("2027-11-22T00:00:00.000Z"),
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
      from: new Date("2027-11-20T00:00:00.000Z"),
      to: new Date("2027-11-22T00:00:00.000Z"),
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
  assert.equal(updated.payments[1]?.referenceId, null);
  assert.equal(updated.payments[1]?.payerDetail, null);

  const receipts = await prisma.billingDocument.findMany({
    where: { bookingId: booking.id, type: BillingDocumentType.RECEIPT },
    orderBy: { issuedAt: "asc" },
  });
  assert.equal(receipts.length, 2);
  assert.equal(receipts[0]?.paid.toString(), "10");
  assert.equal(receipts[1]?.paid.toString(), "5590");
  assert.equal(receipts[1]?.balance.toString(), "0");

  const invoice = await prisma.billingDocument.findFirstOrThrow({
    where: { bookingId: booking.id, type: BillingDocumentType.INVOICE },
  });
  assert.equal(invoice.paid.toString(), "5600");
  assert.equal(invoice.balance.toString(), "0");
});

test("dashboard records offline payment proof metadata", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: new Date("2027-06-02T00:00:00.000Z"),
      to: new Date("2027-06-04T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-proof-token`,
  });

  const updated = await dashboardService.recordBookingBalancePayment(
    state.managerId,
    booking.id,
    {
      amount: 5590,
      method: PaymentMethod.CARD_POS,
      referenceId: "POS-TXN-12345",
      payerDetail: "Card last 4: 4242",
      idempotencyKey: `${testId}-proof-balance`,
    },
  );

  const balancePayment = updated.payments.find(
    (item) => item.purpose === PaymentPurpose.BALANCE,
  );
  assert.ok(balancePayment);
  assert.equal(balancePayment.method, PaymentMethod.CARD_POS);
  assert.equal(balancePayment.referenceId, "POS-TXN-12345");
  assert.equal(balancePayment.payerDetail, "Card last 4: 4242");

  const paymentRow = await prisma.payment.findFirstOrThrow({
    where: {
      bookingId: booking.id,
      purpose: PaymentPurpose.BALANCE,
    },
  });
  const metadata = paymentRow.metadata;
  assert.ok(
    metadata !== null && typeof metadata === "object" && !Array.isArray(metadata),
  );
  assert.equal(metadata.source, "DASHBOARD_BALANCE_PAYMENT");
  assert.equal(metadata.recordedVia, "DASHBOARD");
  assert.equal(metadata.manualReferenceId, "POS-TXN-12345");
  assert.equal(metadata.manualPayerDetail, "Card last 4: 4242");
});

test("dashboard rejects referenced offline methods without reference id", async () => {
  const booking = await createBooking(
    new Date("2027-06-06T00:00:00.000Z"),
    new Date("2027-06-08T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-missing-ref-token`,
  });

  await assert.rejects(
    () =>
      dashboardService.recordBookingBalancePayment(state.superAdminId, booking.id, {
        amount: 100,
        method: PaymentMethod.UPI_MANUAL,
        idempotencyKey: `${testId}-missing-ref-balance`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "PAYMENT_REFERENCE_REQUIRED");
      return true;
    },
  );
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
        referenceId: "UPI-OVERPAYMENT-REF",
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

test("dashboard records manual refunds with idempotency and over-refund protection", async () => {
  await setPropertyTokenRefundable(state.propertyId, true);
  const booking = await createBooking(
    new Date("2027-05-26T00:00:00.000Z"),
    new Date("2027-05-28T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-refund-token`,
  });
  const paidBooking = await dashboardService.recordBookingBalancePayment(
    state.superAdminId,
    booking.id,
    {
      amount: 5590,
      method: PaymentMethod.CASH,
      idempotencyKey: `${testId}-refund-balance`,
    },
  );

  await dashboardService.updateBooking(state.superAdminId, booking.id, {
    status: BookingStatus.CANCELLED,
    note: "Guest cancelled after payment",
  });

  const tokenPayment = paidBooking.payments.find(
    (payment) => payment.purpose === PaymentPurpose.TOKEN,
  );
  const balancePayment = paidBooking.payments.find(
    (payment) => payment.purpose === PaymentPurpose.BALANCE,
  );
  assert.ok(tokenPayment);
  assert.ok(balancePayment);

  const afterTokenRefund = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: tokenPayment.id,
      amount: 5,
      method: PaymentMethod.UPI_MANUAL,
      reason: "Partial token refund",
      idempotencyKey: `${testId}-refund-token-key`,
    },
  );

  assert.equal(afterTokenRefund.refundedAmount, "5");
  assert.equal(afterTokenRefund.netPaidAmount, "5595");
  assert.equal(afterTokenRefund.refundableAmount, "5595");
  assert.equal(afterTokenRefund.payments[0]?.refundedAmount, "5");
  assert.equal(afterTokenRefund.payments[0]?.refundableAmount, "5");

  const duplicateRefund = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: tokenPayment.id,
      amount: 5,
      method: PaymentMethod.UPI_MANUAL,
      reason: "Partial token refund",
      idempotencyKey: `${testId}-refund-token-key`,
    },
  );
  assert.equal(duplicateRefund.refundedAmount, "5");

  await assert.rejects(
    () =>
      dashboardService.recordBookingRefund(state.superAdminId, booking.id, {
        paymentId: tokenPayment.id,
        amount: 6,
        method: PaymentMethod.UPI_MANUAL,
        reason: "Too much",
        idempotencyKey: `${testId}-refund-over`,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "REFUND_OVERPAYMENT");
      return true;
    },
  );

  const afterBalanceRefund = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: balancePayment.id,
      amount: 5590,
      method: PaymentMethod.CASH,
      reason: "Cash returned at desk",
      idempotencyKey: `${testId}-refund-balance-key`,
    },
  );
  assert.equal(afterBalanceRefund.refundedAmount, "5595");
  assert.equal(afterBalanceRefund.refundableAmount, "5");

  const fullyRefunded = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: tokenPayment.id,
      amount: 5,
      method: PaymentMethod.UPI_MANUAL,
      reason: "Remaining token refund",
      idempotencyKey: `${testId}-refund-token-rest-key`,
    },
  );
  assert.equal(fullyRefunded.paymentStatus, "REFUNDED");
  assert.equal(fullyRefunded.refundedAmount, "5600");
  assert.equal(fullyRefunded.refundableAmount, "0");

  const refundRows = await prisma.paymentRefund.findMany({
    where: { bookingId: booking.id },
  });
  assert.equal(refundRows.length, 3);
  assert.ok(
    refundRows.every((refund) => refund.status === PaymentRefundStatus.SUCCEEDED),
  );
});

test("guest refund request can be reviewed and fulfilled by admin", async () => {
  await setPropertyTokenRefundable(state.propertyId, true);
  const booking = await createBooking(
    new Date("2026-01-20T00:00:00.000Z"),
    new Date("2026-01-22T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-refund-request-token`,
  });
  const noShowBooking = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.NO_SHOW,
      note: "Guest did not arrive after cutoff",
    },
  );

  const requested = await publicService.createRefundRequest(
    state.guestId,
    noShowBooking.id,
    "Please refund because I could not travel",
  );
  assert.equal(requested.refundRequest?.status, BookingRefundRequestStatus.REQUESTED);

  await assert.rejects(
    () =>
      publicService.createRefundRequest(
        state.guestId,
        noShowBooking.id,
        "Duplicate request",
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "REFUND_REQUEST_ALREADY_EXISTS");
      return true;
    },
  );

  const inReview = await dashboardService.updateRefundRequest(
    state.superAdminId,
    noShowBooking.id,
    requested.refundRequest!.id,
    {
      status: BookingRefundRequestStatus.IN_REVIEW,
    },
  );
  assert.equal(inReview.refundRequest?.status, BookingRefundRequestStatus.IN_REVIEW);

  const payment = inReview.payments[0];
  assert.ok(payment);

  const partialRefund = await dashboardService.recordBookingRefund(
    state.superAdminId,
    noShowBooking.id,
    {
      paymentId: payment.id,
      amount: 5,
      method: PaymentMethod.MANUAL,
      reason: "Partial refund approved",
      refundRequestId: requested.refundRequest!.id,
      idempotencyKey: `${testId}-request-partial-refund`,
    },
  );
  assert.equal(partialRefund.refundRequest?.status, BookingRefundRequestStatus.IN_REVIEW);
  assert.equal(partialRefund.refundedAmount, "5");

  const fulfilled = await dashboardService.recordBookingRefund(
    state.superAdminId,
    noShowBooking.id,
    {
      paymentId: payment.id,
      amount: 5,
      method: PaymentMethod.MANUAL,
      reason: "Remaining refund approved",
      refundRequestId: requested.refundRequest!.id,
      idempotencyKey: `${testId}-request-final-refund`,
    },
  );
  assert.equal(fulfilled.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);
  assert.equal(fulfilled.refundableAmount, "0");

  const publicBooking = await publicService.getBookingById(
    state.guestId,
    noShowBooking.id,
  );
  assert.equal(publicBooking.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);
});

test("refund request is fulfilled when non-refundable token is the only remainder", async () => {
  await setPropertyTokenRefundable(state.propertyId, false);
  const booking = await createBooking(
    new Date("2027-06-16T00:00:00.000Z"),
    new Date("2027-06-18T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-nonref-request-token`,
  });
  const paidBooking = await dashboardService.recordBookingBalancePayment(
    state.superAdminId,
    booking.id,
    {
      amount: 5990,
      method: PaymentMethod.CASH,
      idempotencyKey: `${testId}-nonref-request-balance`,
    },
  );
  await dashboardService.updateBooking(state.superAdminId, booking.id, {
    status: BookingStatus.CANCELLED,
    note: "Guest cancelled after paying",
  });
  const requested = await publicService.createRefundRequest(
    state.guestId,
    booking.id,
    "Please refund eligible amount",
  );
  const balancePayment = paidBooking.payments.find(
    (payment) => payment.purpose === PaymentPurpose.BALANCE,
  );
  assert.ok(balancePayment);

  const fulfilled = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: balancePayment.id,
      amount: 5990,
      method: PaymentMethod.CASH,
      reason: "Eligible balance refund",
      refundRequestId: requested.refundRequest!.id,
      idempotencyKey: `${testId}-nonref-request-refund`,
    },
  );
  assert.equal(fulfilled.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);
  assert.equal(fulfilled.refundableAmount, "0");

  const publicBooking = await publicService.getBookingById(
    state.guestId,
    booking.id,
  );
  assert.equal(publicBooking.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);
  assert.equal(publicBooking.refundableAmount, 0);
});

test("dashboard refund auto-links active request when request id is omitted", async () => {
  await setPropertyTokenRefundable(state.propertyId, true);
  const booking = await createBooking(
    new Date("2027-06-20T00:00:00.000Z"),
    new Date("2027-06-22T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-auto-link-token`,
  });
  await dashboardService.updateBooking(state.superAdminId, booking.id, {
    status: BookingStatus.CANCELLED,
    note: "Guest cancelled after token",
  });
  const requested = await publicService.createRefundRequest(
    state.guestId,
    booking.id,
    "Please refund token",
  );
  assert.equal(requested.refundRequest?.status, BookingRefundRequestStatus.REQUESTED);
  const tokenPayment = await prisma.payment.findFirstOrThrow({
    where: { bookingId: booking.id, purpose: PaymentPurpose.TOKEN },
  });

  const fulfilled = await dashboardService.recordBookingRefund(
    state.superAdminId,
    booking.id,
    {
      paymentId: tokenPayment.id,
      amount: 10,
      method: PaymentMethod.MANUAL,
      reason: "Token refunded",
      idempotencyKey: `${testId}-auto-link-refund`,
    },
  );

  assert.equal(fulfilled.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);
  const fulfilledTokenPayment = fulfilled.payments.find(
    (item) => item.id === tokenPayment.id,
  );
  assert.equal(
    fulfilledTokenPayment?.refunds[0]?.refundRequestId,
    requested.refundRequest?.id,
  );
});

test("stale fulfilled refund requests are repaired when booking is loaded", async () => {
  await setPropertyTokenRefundable(state.propertyId, true);
  const booking = await createBooking(
    new Date("2027-06-24T00:00:00.000Z"),
    new Date("2027-06-26T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-stale-request-token`,
  });
  await dashboardService.updateBooking(state.superAdminId, booking.id, {
    status: BookingStatus.CANCELLED,
    note: "Guest cancelled after token",
  });
  const requested = await publicService.createRefundRequest(
    state.guestId,
    booking.id,
    "Please refund token",
  );
  await dashboardService.updateRefundRequest(
    state.superAdminId,
    booking.id,
    requested.refundRequest!.id,
    {
      status: BookingRefundRequestStatus.IN_REVIEW,
    },
  );
  const payment = await prisma.payment.findFirstOrThrow({
    where: { bookingId: booking.id, purpose: PaymentPurpose.TOKEN },
  });
  await prisma.paymentRefund.create({
    data: {
      bookingId: booking.id,
      paymentId: payment.id,
      propertyId: booking.propertyId,
      userId: state.guestId,
      provider: payment.provider,
      status: PaymentRefundStatus.SUCCEEDED,
      method: PaymentMethod.MANUAL,
      amount: payment.amount,
      currency: payment.currency,
      reason: "Legacy unlinked refund",
      idempotencyKey: `${testId}-stale-request-refund`,
      processedAt: new Date(),
    },
  });

  const dashboardBooking = await dashboardService.getBookingById(
    state.superAdminId,
    booking.id,
  );
  assert.equal(dashboardBooking.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);

  const publicBooking = await publicService.getBookingById(
    state.guestId,
    booking.id,
  );
  assert.equal(publicBooking.refundRequest?.status, BookingRefundRequestStatus.FULFILLED);

  const requestRow = await prisma.bookingRefundRequest.findUniqueOrThrow({
    where: { id: requested.refundRequest!.id },
  });
  assert.equal(requestRow.status, BookingRefundRequestStatus.FULFILLED);
});

test("guest refund request rejects non-closed or unpaid bookings", async () => {
  const pendingBooking = await createBooking(
    new Date("2027-06-01T00:00:00.000Z"),
    new Date("2027-06-03T00:00:00.000Z"),
  );

  await assert.rejects(
    () =>
      publicService.createRefundRequest(
        state.guestId,
        pendingBooking.id,
        "Refund please",
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "REFUND_REQUEST_NOT_ALLOWED");
      return true;
    },
  );

  const unpaidCancelled = await createBooking(
    new Date("2027-06-04T00:00:00.000Z"),
    new Date("2027-06-06T00:00:00.000Z"),
  );
  await publicService.cancelBooking(
    state.guestId,
    unpaidCancelled.id,
    "Changed my plan",
  );

  await assert.rejects(
    () =>
      publicService.createRefundRequest(
        state.guestId,
        unpaidCancelled.id,
        "Refund please",
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_NOT_REFUNDABLE");
      return true;
    },
  );
});

test("admin can reject a refund request with an admin note", async () => {
  await setPropertyTokenRefundable(state.propertyId, true);
  const booking = await createBooking(
    new Date("2027-06-08T00:00:00.000Z"),
    new Date("2027-06-10T00:00:00.000Z"),
  );
  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-refund-reject-token`,
  });
  const cancelled = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.CANCELLED,
      note: "Guest cancelled before arrival",
    },
  );
  const requested = await publicService.createRefundRequest(
    state.guestId,
    cancelled.id,
    "Refund request for cancellation",
  );

  await assert.rejects(
    () =>
      dashboardService.updateRefundRequest(
        state.superAdminId,
        cancelled.id,
        requested.refundRequest!.id,
        {
          status: BookingRefundRequestStatus.REJECTED,
        },
      ),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "REFUND_REJECTION_NOTE_REQUIRED");
      return true;
    },
  );

  const rejected = await dashboardService.updateRefundRequest(
    state.superAdminId,
    cancelled.id,
    requested.refundRequest!.id,
    {
      status: BookingRefundRequestStatus.REJECTED,
      adminNote: "Refund denied by policy",
    },
  );
  assert.equal(rejected.refundRequest?.status, BookingRefundRequestStatus.REJECTED);
  assert.equal(rejected.refundRequest?.adminNote, "Refund denied by policy");
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

test("dashboard can reassign a single-room booking", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: new Date("2027-10-01T00:00:00.000Z"),
      to: new Date("2027-10-03T00:00:00.000Z"),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const updated = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      roomIds: [state.assignmentRoomId],
    },
  );

  assert.equal(updated.items.length, 1);
  assert.equal(updated.items[0]?.roomId, state.assignmentRoomId);
  assert.equal(updated.roomId, state.assignmentRoomId);
});

test("dashboard can reassign all rooms on a multi-room booking", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "MULTI_ROOM",
      spaceIds: [state.pricingId, state.pricingTwoId],
      from: new Date("2027-10-10T00:00:00.000Z"),
      to: new Date("2027-10-12T00:00:00.000Z"),
      guests: 3,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  const updated = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      roomIds: [state.assignmentRoomId, state.assignmentRoomTwoId],
    },
  );

  assert.deepEqual(
    updated.items.map((item) => item.roomId).sort(),
    [state.assignmentRoomId, state.assignmentRoomTwoId].sort(),
  );
});

test("dashboard multi-room reassignment requires exact unique room count", async () => {
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "MULTI_ROOM",
      spaceIds: [state.pricingId, state.pricingTwoId],
      from: new Date("2027-10-20T00:00:00.000Z"),
      to: new Date("2027-10-22T00:00:00.000Z"),
      guests: 3,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [state.assignmentRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "ROOM_ASSIGNMENT_COUNT_MISMATCH");
      return true;
    },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [
          state.assignmentRoomId,
          state.assignmentRoomTwoId,
          state.otherPropertyRoomId,
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "ROOM_ASSIGNMENT_COUNT_MISMATCH");
      return true;
    },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [state.assignmentRoomId, state.assignmentRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "DUPLICATE_ROOM_ASSIGNMENT");
      return true;
    },
  );
});

test("dashboard room reassignment rejects wrong property and unavailable rooms", async () => {
  const checkIn = new Date("2027-07-01T00:00:00.000Z");
  const checkOut = new Date("2027-07-03T00:00:00.000Z");
  const booking = await publicService.createBooking(
    state.guestId,
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

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [state.otherPropertyRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 400);
      assert.equal(error.code, "INVALID_ROOM");
      return true;
    },
  );

  const maintenanceRoom = await prisma.room.findUniqueOrThrow({
    where: { id: state.assignmentRoomId },
  });
  await prisma.maintenanceBlock.create({
    data: {
      propertyId: state.propertyId,
      unitId: maintenanceRoom.unitId,
      roomId: maintenanceRoom.id,
      targetType: MaintenanceTargetType.ROOM,
      reason: "Assignment test maintenance",
      startDate: checkIn,
      endDate: checkOut,
      createdByUserId: state.superAdminId,
    },
  });

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [state.assignmentRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "ROOM_NOT_AVAILABLE");
      return true;
    },
  );
});

test("dashboard room reassignment rejects overlapping bookings", async () => {
  const checkIn = new Date("2027-07-10T00:00:00.000Z");
  const checkOut = new Date("2027-07-12T00:00:00.000Z");
  const existingBooking = await publicService.createBooking(
    state.guestId,
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
  const occupiedRoomId = existingBooking.items[0]?.roomId;
  assert.ok(occupiedRoomId);

  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: checkIn,
      to: checkOut,
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [occupiedRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "ROOM_NOT_AVAILABLE");
      return true;
    },
  );
});

test("dashboard booking status updates append audit history and notes", async () => {
  const checkIn = utcDateOnly(new Date());
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingId,
      from: checkIn,
      to: addUtcDays(checkIn, 2),
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

test("dashboard booking status update rejects check-in before check-in date", async () => {
  const checkIn = addUtcDays(utcDateOnly(new Date()), 30);
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: checkIn,
      to: addUtcDays(checkIn, 2),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-early-check-in-payment`,
  });

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        status: BookingStatus.CHECKED_IN,
        note: "Tried check-in before arrival date.",
        allowBalanceDueCheckIn: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "CHECK_IN_TOO_EARLY");
      assert.equal(
        error.message,
        "Guest can be checked in only on or after the check-in date",
      );
      return true;
    },
  );
});

test("dashboard booking status update allows checkout before checkout date", async () => {
  const checkIn = utcDateOnly(new Date());
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: checkIn,
      to: addUtcDays(checkIn, 2),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-early-check-out-payment`,
  });

  const checkedIn = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.CHECKED_IN,
      note: "Guest arrived on check-in date.",
      allowBalanceDueCheckIn: true,
    },
  );
  assert.equal(checkedIn.status, BookingStatus.CHECKED_IN);

  const checkedOut = await dashboardService.updateBooking(
    state.superAdminId,
    booking.id,
    {
      status: BookingStatus.CHECKED_OUT,
      note: "Guest left before scheduled departure date.",
    },
  );

  assert.equal(checkedOut.status, BookingStatus.CHECKED_OUT);
  assert.equal(
    checkedOut.statusHistory[checkedOut.statusHistory.length - 1]?.fromStatus,
    BookingStatus.CHECKED_IN,
  );
  assert.equal(
    checkedOut.statusHistory[checkedOut.statusHistory.length - 1]?.toStatus,
    BookingStatus.CHECKED_OUT,
  );
  assert.equal(
    checkedOut.statusHistory[checkedOut.statusHistory.length - 1]?.note,
    "Guest left before scheduled departure date.",
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

test("simulated failed payment leaves booking pending and creates failed payment record", async () => {
  const booking = await createBooking(
    new Date("2027-09-01T00:00:00.000Z"),
    new Date("2027-09-03T00:00:00.000Z"),
  );
  assert.equal(booking.status, BookingStatus.PENDING);

  const result = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-failed-payment-simulation`,
    status: PaymentStatus.FAILED,
  });

  assert.equal(result.payment.status, PaymentStatus.FAILED);
  assert.equal(result.payment.provider, "MANUAL");
  assert.equal(result.booking.status, BookingStatus.PENDING);
  assert.equal(result.booking.paymentStatus, "PENDING");

  const failedPayment = await prisma.payment.findUniqueOrThrow({
    where: { idempotencyKey: `${testId}-failed-payment-simulation` },
  });
  assert.equal(failedPayment.status, PaymentStatus.FAILED);
  assert.equal(failedPayment.failureCode, "SIMULATED_FAILURE");

  const successResult = await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-failed-payment-simulation-retry`,
    status: PaymentStatus.SUCCEEDED,
  });
  assert.equal(successResult.payment.status, PaymentStatus.SUCCEEDED);
  assert.equal(successResult.booking.status, BookingStatus.CONFIRMED);
});

test("dashboard booking status update rejects check-in after check-in date has passed", async () => {
  const checkIn = addUtcDays(utcDateOnly(new Date()), -4);
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: checkIn,
      to: addUtcDays(checkIn, 2),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await paymentsService.createManualPayment({
    userId: state.guestId,
    bookingId: booking.id,
    idempotencyKey: `${testId}-late-check-in-payment`,
  });

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        status: BookingStatus.CHECKED_IN,
        note: "Tried check-in after arrival date passed.",
        allowBalanceDueCheckIn: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "CHECK_IN_TOO_LATE");
      assert.equal(
        error.message,
        "Guest cannot be checked in after the check-in date has passed",
      );
      return true;
    },
  );
});

test("dashboard booking status update rejects room assignment after check-in date has passed", async () => {
  const checkIn = addUtcDays(utcDateOnly(new Date()), -8);
  const booking = await publicService.createBooking(
    state.guestId,
    {
      bookingType: "SINGLE_TARGET",
      spaceId: state.pricingTwoId,
      from: checkIn,
      to: addUtcDays(checkIn, 2),
      guests: 2,
      comfortOption: ComfortOption.AC,
    },
    { tenantSlug: state.tenantSlug },
  );

  await assert.rejects(
    () =>
      dashboardService.updateBooking(state.superAdminId, booking.id, {
        roomIds: [state.assignmentRoomId],
      }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "BOOKING_ASSIGNMENT_CLOSED");
      assert.equal(
        error.message,
        "Cannot change room assignment after the check-in date has passed",
      );
      return true;
    },
  );
});
