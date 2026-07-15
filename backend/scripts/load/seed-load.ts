import "dotenv/config";

import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";

import { prisma } from "../../src/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomHousekeepingStatus,
  RoomProductCategory,
  RoomStatus,
  UnitStatus,
  UserRole,
  type Prisma,
} from "../../src/generated/prisma/client.js";
import type { LoadProfile } from "./load-config.js";

const tenantSlug = "load-rently";
const managerEmail = "manager.load@rently.test";
const guestEmail = "guest.load@rently.test";
const adminEmail = "admin.load@rently.test";
const password = process.env.LOAD_PASSWORD ?? "LoadOnly@12345";
const city = "Load Test City";

const requireIsolatedDatabase = () => {
  const databaseName = process.env.DATABASE_NAME?.trim() ?? "";
  if (!/(load|audit|test|e2e)/i.test(databaseName)) {
    throw new Error(
      `Load seed requires an isolated load/audit/test/e2e database; received ${databaseName || "<empty>"}`,
    );
  }
  return databaseName;
};

const inChunks = async <T>(
  values: T[],
  operation: (chunk: T[]) => Promise<unknown>,
  chunkSize = 500,
) => {
  for (let index = 0; index < values.length; index += chunkSize) {
    await operation(values.slice(index, index + chunkSize));
  }
};

const utcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const addDays = (value: Date, days: number) =>
  new Date(value.getTime() + days * 24 * 60 * 60 * 1_000);

export interface LoadSeedContext {
  databaseName: string;
  tenantSlug: string;
  city: string;
  managerEmail: string;
  password: string;
  propertyId: string;
  propertyCount: number;
  roomCount: number;
  bookingCount: number;
}

export const seedLoadData = async (
  profile: LoadProfile,
): Promise<LoadSeedContext> => {
  const databaseName = requireIsolatedDatabase();
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (existingTenant) {
    await prisma.property.deleteMany({
      where: { tenantId: existingTenant.id },
    });
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }
  await prisma.user.deleteMany({
    where: { email: { in: [managerEmail, guestEmail, adminEmail] } },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      fullName: "Load Test Admin",
      email: adminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      countryCode: "+91",
      contactNumber: "9100000000",
    },
  });
  const [manager, guest] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "Load Test Manager",
        email: managerEmail,
        passwordHash,
        role: UserRole.MANAGER,
        createdByUserId: admin.id,
        countryCode: "+91",
        contactNumber: "9100000001",
      },
    }),
    prisma.user.create({
      data: {
        fullName: "Load Test Guest",
        email: guestEmail,
        passwordHash,
        role: UserRole.GUEST,
        countryCode: "+91",
        contactNumber: "9100000002",
      },
    }),
  ]);
  const tenant = await prisma.tenant.create({
    data: {
      name: "Rently Load Tenant",
      slug: tenantSlug,
      brandName: "Rently Load",
      supportEmail: "support.load@rently.test",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });

  const allRooms: Array<{
    id: string;
    unitId: string;
    propertyId: string;
    pricingId: string;
    productId: string;
    label: string;
  }> = [];
  const propertyIds: string[] = [];

  for (let propertyIndex = 0; propertyIndex < profile.seed.properties; propertyIndex += 1) {
    const property = await prisma.property.create({
      data: {
        tenantId: tenant.id,
        slug: `load-property-${propertyIndex + 1}`,
        name: `Load Property ${propertyIndex + 1}`,
        address: `${propertyIndex + 1} Capacity Avenue`,
        city,
        state: "Load State",
        status: PropertyStatus.ACTIVE,
        createdByUserId: admin.id,
      },
    });
    propertyIds.push(property.id);
    await Promise.all([
      prisma.propertyAssignment.create({
        data: {
          propertyId: property.id,
          userId: manager.id,
          role: PropertyAssignmentRole.MANAGER,
          assignedByUserId: admin.id,
        },
      }),
      prisma.propertyBookingPolicy.create({
        data: {
          propertyId: property.id,
          advancePaymentValue: 500,
          tokenRefundable: true,
          cancellationRules: [],
          refundRules: [],
          earlyCheckInRules: {
            enabled: true,
            feeType: "NONE",
            feeValue: 0,
            overrideRole: "ADMIN",
          },
          earlyCheckoutRules: {
            refundUnusedNights: false,
            refundPercentage: 0,
            manualReviewRequired: true,
            overrideRole: "ADMIN",
          },
          lateCheckoutRules: {
            feeType: "NIGHTLY_RATE_MULTIPLIER",
            feeValue: 1,
            graceMinutes: 0,
            overrideRole: "ADMIN",
          },
          downgradeRules: {
            financialTreatment: "NO_CREDIT",
            overrideRole: "ADMIN",
          },
          noShowRules: [],
          guestPolicyText: "Load-test-only property policy.",
        },
      }),
    ]);
    const product = await prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: "Load Double Room",
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    });

    for (let unitIndex = 0; unitIndex < profile.seed.unitsPerProperty; unitIndex += 1) {
      const unit = await prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `L-${propertyIndex + 1}-${String(unitIndex + 1).padStart(3, "0")}`,
          floor: Math.floor(unitIndex / 10) + 1,
          status: UnitStatus.ACTIVE,
        },
      });
      for (let roomIndex = 0; roomIndex < profile.seed.roomsPerUnit; roomIndex += 1) {
        const roomNumber = `${unitIndex + 1}${String(roomIndex + 1).padStart(2, "0")}`;
        const room = await prisma.room.create({
          data: {
            unitId: unit.id,
            name: `Load Room ${roomNumber}`,
            number: roomNumber,
            hasAC: true,
            maxOccupancy: 2,
            status: RoomStatus.AVAILABLE,
            housekeepingStatus: RoomHousekeepingStatus.INSPECTED,
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
            price: 2_500 + propertyIndex * 100,
            validFrom: new Date("2025-01-01T00:00:00.000Z"),
          },
        });
        allRooms.push({
          id: room.id,
          unitId: unit.id,
          propertyId: property.id,
          pricingId: pricing.id,
          productId: product.id,
          label: `${property.name} / ${unit.unitNumber} / ${room.number}`,
        });
      }
    }
  }

  const targetRooms = allRooms.filter((room) => room.propertyId === propertyIds[0]);
  const today = utcDay(new Date());
  const bookings: Prisma.BookingCreateManyInput[] = [];
  const bookingItems: Prisma.BookingItemCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  const activeCount = Math.min(targetRooms.length, 40);

  for (let index = 0; index < profile.seed.historicalBookings; index += 1) {
    const room = targetRooms[index % targetRooms.length]!;
    const bookingId = randomUUID();
    const isActive = index < activeCount;
    const activeVariant = index % 4;
    const historicalOffset = (index % 365) + 3;
    const checkIn = isActive
      ? addDays(today, activeVariant === 0 ? 0 : activeVariant === 1 ? -1 : activeVariant === 2 ? -2 : -3)
      : addDays(today, -historicalOffset);
    const checkOut = isActive
      ? addDays(today, activeVariant === 1 ? 0 : activeVariant === 3 ? 1 : 2)
      : addDays(checkIn, (index % 4) + 1);
    const status = isActive
      ? activeVariant === 0 || activeVariant === 2
        ? BookingStatus.CONFIRMED
        : BookingStatus.CHECKED_IN
      : BookingStatus.CHECKED_OUT;
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000));
    const totalAmount = nights * 2_500;
    const createdAt = addDays(checkIn, -Math.min(30, (index % 20) + 1));
    bookings.push({
      id: bookingId,
      bookingRef: `LOAD-${String(index + 1).padStart(7, "0")}`,
      propertyId: room.propertyId,
      userId: guest.id,
      productId: room.productId,
      targetType: BookingTargetType.ROOM,
      unitId: room.unitId,
      roomId: room.id,
      guestCount: 2,
      comfortOption: ComfortOption.AC,
      guestNameSnapshot: `Load Guest ${index + 1}`,
      guestEmailSnapshot: guestEmail,
      guestContactSnapshot: "+919100000002",
      targetLabel: room.label,
      productName: "Load Double Room",
      pricePerNight: 2_500,
      checkIn,
      checkOut,
      status,
      ...(status === BookingStatus.CHECKED_IN && { checkedInAt: addDays(today, -1) }),
      ...(status === BookingStatus.CHECKED_OUT && { checkedOutAt: checkOut }),
      subtotalAmount: totalAmount,
      taxableAmount: totalAmount,
      totalAmount,
      paymentStatus: BookingPaymentStatus.PAID,
      paymentPolicy: BookingPaymentPolicy.TOKEN_AT_BOOKING,
      upfrontAmount: 500,
      policySnapshot: { source: "LOAD_PROFILE", capturedAt: createdAt.toISOString() },
      createdAt,
      updatedAt: createdAt,
    });
    bookingItems.push({
      id: randomUUID(),
      bookingId,
      productId: room.productId,
      targetType: BookingTargetType.ROOM,
      unitId: room.unitId,
      roomId: room.id,
      guestCount: 2,
      comfortOption: ComfortOption.AC,
      targetLabel: room.label,
      productName: "Load Double Room",
      capacity: 2,
      pricePerNight: 2_500,
      pricingId: room.pricingId,
      subtotalAmount: totalAmount,
      taxableAmount: totalAmount,
      totalAmount,
      finalAmount: totalAmount,
      createdAt,
    });
    payments.push({
      id: randomUUID(),
      bookingId,
      propertyId: room.propertyId,
      userId: guest.id,
      provider: PaymentProvider.MANUAL,
      status: PaymentStatus.SUCCEEDED,
      purpose: PaymentPurpose.FULL_PAYMENT,
      method: PaymentMethod.CASH,
      amount: totalAmount,
      currency: "INR",
      idempotencyKey: `load-payment-${index + 1}`,
      receivedByUserId: manager.id,
      paidAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await inChunks(bookings, (data) => prisma.booking.createMany({ data }));
  await inChunks(bookingItems, (data) => prisma.bookingItem.createMany({ data }));
  await inChunks(payments, (data) => prisma.payment.createMany({ data }));

  return {
    databaseName,
    tenantSlug,
    city,
    managerEmail,
    password,
    propertyId: propertyIds[0]!,
    propertyCount: propertyIds.length,
    roomCount: allRooms.length,
    bookingCount: bookings.length,
  };
};
