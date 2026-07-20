import "dotenv/config";
import { spawnSync } from "node:child_process";
import { hash } from "bcrypt";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mysql from "mysql2/promise";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { e2eFixture } from "./fixtures.js";

const requiredEnv = (key: string) => {
  const value = process.env[key]?.trim();
  if (!value)
    throw new Error(`Missing required E2E environment variable: ${key}`);
  return value;
};

const databaseName = process.env.E2E_DATABASE_NAME?.trim() || "rently_e2e";
if (!/^[A-Za-z0-9_]+_e2e$/.test(databaseName)) {
  throw new Error(
    "Refusing E2E reset: E2E_DATABASE_NAME must contain only letters, numbers, or underscores and end with _e2e",
  );
}

const databaseUrl = new URL(requiredEnv("DATABASE_URL"));
databaseUrl.pathname = `/${databaseName}`;
process.env.E2E_DATABASE_NAME = databaseName;
process.env.DATABASE_NAME = databaseName;
process.env.DATABASE_URL = databaseUrl.toString();

const connection = {
  host: requiredEnv("DATABASE_HOST"),
  port: Number(requiredEnv("DATABASE_PORT")),
  user: requiredEnv("DATABASE_USER"),
  password: requiredEnv("DATABASE_PASSWORD"),
};

const adminConnection = await mysql.createConnection(connection);
try {
  await adminConnection.query(`DROP DATABASE IF EXISTS \`${databaseName}\``);
  await adminConnection.query(
    `CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
} finally {
  await adminConnection.end();
}

const migration = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);
if (migration.status !== 0) {
  throw new Error(
    `Failed to apply migrations to the E2E database: ${migration.error?.message ?? migration.signal ?? migration.status}`,
  );
}

const adapter = new PrismaMariaDb({
  ...connection,
  database: databaseName,
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
  ssl: false,
});
const prisma = new PrismaClient({ adapter });

try {
  const passwordHash = await hash(e2eFixture.users.superAdmin.password, 10);
  await prisma.user.createMany({
    data: [
      {
        id: e2eFixture.users.superAdmin.id,
        fullName: "E2E Super Admin",
        email: e2eFixture.users.superAdmin.email,
        passwordHash,
        role: "SUPER_ADMIN",
      },
      {
        id: e2eFixture.users.admin.id,
        fullName: "E2E Admin",
        email: e2eFixture.users.admin.email,
        passwordHash,
        role: "ADMIN",
        createdByUserId: e2eFixture.users.superAdmin.id,
      },
      {
        id: e2eFixture.users.manager.id,
        fullName: "E2E Manager",
        email: e2eFixture.users.manager.email,
        passwordHash,
        role: "MANAGER",
        createdByUserId: e2eFixture.users.admin.id,
      },
      {
        id: e2eFixture.users.frontDesk.id,
        fullName: "E2E Front Desk",
        email: e2eFixture.users.frontDesk.email,
        passwordHash,
        role: "FRONT_DESK",
        createdByUserId: e2eFixture.users.admin.id,
      },
      {
        id: e2eFixture.users.accountant.id,
        fullName: "E2E Accountant",
        email: e2eFixture.users.accountant.email,
        passwordHash,
        role: "ACCOUNTANT",
        createdByUserId: e2eFixture.users.admin.id,
      },
      {
        id: e2eFixture.users.guest.id,
        fullName: "E2E Guest",
        email: e2eFixture.users.guest.email,
        passwordHash,
        role: "GUEST",
      },
    ],
  });

  await prisma.tenant.create({
    data: {
      id: e2eFixture.tenant.id,
      name: "E2E Tenant",
      slug: e2eFixture.tenant.slug,
      brandName: "E2E Rently",
      supportEmail: "support@e2e.rently.test",
      timezone: "Asia/Kolkata",
    },
  });
  await prisma.property.createMany({
    data: [
      {
        id: e2eFixture.property.id,
        tenantId: e2eFixture.tenant.id,
        slug: e2eFixture.property.slug,
        name: "E2E Serviced Apartment",
        address: "1 Test Avenue",
        city: "Bengaluru",
        state: "Karnataka",
        createdByUserId: e2eFixture.users.superAdmin.id,
      },
      {
        id: e2eFixture.outOfScopeProperty.id,
        tenantId: e2eFixture.tenant.id,
        slug: e2eFixture.outOfScopeProperty.slug,
        name: "E2E Out of Scope Property",
        address: "2 Test Avenue",
        city: "Bengaluru",
        state: "Karnataka",
        createdByUserId: e2eFixture.users.superAdmin.id,
      },
    ],
  });
  await prisma.propertyAssignment.createMany({
    data: [
      {
        propertyId: e2eFixture.property.id,
        userId: e2eFixture.users.admin.id,
        role: "ADMIN",
        assignedByUserId: e2eFixture.users.superAdmin.id,
        primaryAdminPropertyId: e2eFixture.property.id,
      },
      {
        propertyId: e2eFixture.property.id,
        userId: e2eFixture.users.manager.id,
        role: "MANAGER",
        assignedByUserId: e2eFixture.users.admin.id,
      },
      {
        propertyId: e2eFixture.property.id,
        userId: e2eFixture.users.frontDesk.id,
        role: "FRONT_DESK",
        assignedByUserId: e2eFixture.users.admin.id,
      },
      {
        propertyId: e2eFixture.property.id,
        userId: e2eFixture.users.accountant.id,
        role: "ACCOUNTANT",
        assignedByUserId: e2eFixture.users.admin.id,
      },
    ],
  });

  await prisma.unit.create({
    data: {
      id: e2eFixture.unitId,
      propertyId: e2eFixture.property.id,
      unitNumber: "E2E-U1",
      floor: 1,
    },
  });
  await prisma.room.create({
    data: {
      id: e2eFixture.roomId,
      unitId: e2eFixture.unitId,
      name: "E2E Single Room",
      number: "E2E-R1",
      hasAC: false,
      maxOccupancy: 1,
    },
  });
  await prisma.roomProduct.create({
    data: {
      id: e2eFixture.productId,
      propertyId: e2eFixture.property.id,
      name: "E2E Single Occupancy",
      occupancy: 1,
      hasAC: false,
      category: "NIGHTLY",
    },
  });
  await prisma.roomPricing.create({
    data: {
      id: e2eFixture.pricingId,
      propertyId: e2eFixture.property.id,
      roomId: e2eFixture.roomId,
      productId: e2eFixture.productId,
      price: 1500,
      validFrom: new Date("2020-01-01T00:00:00.000Z"),
    },
  });
  await prisma.propertyBookingPolicy.create({
    data: {
      propertyId: e2eFixture.property.id,
      advancePaymentType: "FIXED_AMOUNT",
      advancePaymentValue: 10,
      pendingPaymentExpiryMinutes: 15,
      cancellationRules: { guestCancellationAllowed: true },
      refundRules: { manualReviewRequired: true },
      earlyCheckInRules: {
        enabled: true,
        feeType: "NONE",
        feeValue: 0,
        overrideRole: "ADMIN",
      },
      earlyCheckoutRules: {
        refundUnusedNights: false,
        refundPercentage: 100,
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
      noShowRules: { noShowAfterTime: "20:00" },
      guestPolicyText: "E2E booking policy",
    },
  });
} finally {
  await prisma.$disconnect();
}
