import "dotenv/config";

import bcrypt from "bcrypt";
import { pathToFileURL } from "node:url";

import { prisma } from "../src/db/prisma.js";
import {
  AdvancePaymentType,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomHousekeepingStatus,
  RoomProductCategory,
  RoomStatus,
  UnitStatus,
  UserRole,
} from "../src/generated/prisma/client.js";

const databaseName = process.env.DATABASE_NAME ?? "";
if (!/(audit|test|e2e)/i.test(databaseName)) {
  throw new Error(
    `E2E seed requires an isolated audit/test/e2e database; received ${databaseName || "<empty>"}`,
  );
}

const password = process.env.E2E_PASSWORD ?? "E2eOnly@12345";
const tenantSlug = "e2e-rently";
const otherPropertyId = "00000000-0000-4000-8000-000000000002";
const guestEmail = "guest.e2e@rently.test";
const managerEmail = "manager.e2e@rently.test";
const superAdminEmail = "superadmin.e2e@rently.test";

export const seedE2e = async () => {
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (existingTenant) {
    await prisma.property.deleteMany({
      where: { tenantId: existingTenant.id },
    });
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.deleteMany({
    where: { email: { in: [guestEmail, managerEmail] } },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      fullName: "E2E Super Admin",
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      fullName: "E2E Super Admin",
      email: superAdminEmail,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      countryCode: "+91",
      contactNumber: "9000000000",
    },
  });
  const [guest, manager] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "E2E Guest",
        email: guestEmail,
        passwordHash,
        role: UserRole.GUEST,
        countryCode: "+91",
        contactNumber: "9000000001",
      },
    }),
    prisma.user.create({
      data: {
        fullName: "E2E Manager",
        email: managerEmail,
        passwordHash,
        role: UserRole.MANAGER,
        createdByUserId: superAdmin.id,
        countryCode: "+91",
        contactNumber: "9000000002",
      },
    }),
  ]);
  const tenant = await prisma.tenant.create({
    data: {
      name: "Rently E2E Tenant",
      slug: tenantSlug,
      brandName: "Rently E2E",
      supportEmail: "support.e2e@rently.test",
      defaultCurrency: "INR",
      timezone: "Asia/Kolkata",
    },
  });
  const property = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      slug: "hyderabad-e2e",
      name: "Hyderabad E2E Residence",
      address: "1 Test Avenue",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });
  await prisma.property.create({
    data: {
      id: otherPropertyId,
      tenantId: tenant.id,
      slug: "hyderabad-e2e-restricted",
      name: "Restricted E2E Residence",
      address: "2 Test Avenue",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
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
  await prisma.propertyBookingPolicy.create({
    data: {
      propertyId: property.id,
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 500,
      tokenRefundable: true,
      cancellationRules: [],
      refundRules: [],
      earlyCheckoutRules: [],
      noShowRules: [],
      guestPolicyText: "E2E test property policy.",
    },
  });
  const unit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      unitNumber: "E2E-101",
      floor: 1,
      status: UnitStatus.ACTIVE,
    },
  });
  const rooms = await Promise.all(
    [
      { name: "E2E Bedroom One", number: "101A" },
      { name: "E2E Bedroom Two", number: "101B" },
    ].map((room) =>
      prisma.room.create({
        data: {
          unitId: unit.id,
          ...room,
          hasAC: true,
          maxOccupancy: 2,
          status: RoomStatus.AVAILABLE,
          housekeepingStatus: RoomHousekeepingStatus.INSPECTED,
        },
      }),
    ),
  );
  const [roomProduct, unitProduct] = await Promise.all([
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: "E2E Double Room",
        occupancy: 2,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
    prisma.roomProduct.create({
      data: {
        propertyId: property.id,
        name: "E2E Full Apartment",
        occupancy: 4,
        hasAC: true,
        category: RoomProductCategory.NIGHTLY,
      },
    }),
  ]);
  const validFrom = new Date("2026-01-01T00:00:00.000Z");
  await prisma.roomPricing.createMany({
    data: [
      ...rooms.map((room, index) => ({
        propertyId: property.id,
        roomId: room.id,
        unitId: unit.id,
        productId: roomProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        price: 2500 - index * 100,
        validFrom,
      })),
      {
        propertyId: property.id,
        unitId: unit.id,
        productId: unitProduct.id,
        rateType: RateType.NIGHTLY,
        pricingTier: PricingTier.STANDARD,
        price: 4500,
        validFrom,
      },
    ],
  });

  console.log(
    JSON.stringify({
      tenantSlug,
      propertySlug: property.slug,
      propertyId: property.id,
      otherPropertyId,
      guestEmail,
      managerEmail,
      superAdminEmail,
      passwordSource: process.env.E2E_PASSWORD ? "E2E_PASSWORD" : "local-default",
      guestId: guest.id,
      managerId: manager.id,
    }),
  );
};

export const disconnectE2eSeed = () => prisma.$disconnect();

const entryPath = process.argv[1];
const isDirectRun =
  entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href;

if (isDirectRun) {
  seedE2e()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(disconnectE2eSeed);
}
