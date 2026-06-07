import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  PropertyStatus,
  UserRole,
  PropertyAssignmentRole,
} from "@/generated/prisma/client.js";
import * as reportingService from "@/modules/reporting/reporting.service.js";

const testId = `analytics-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  adminId: string;
  managerId: string;
  tenantId: string;
  propertyId: string;
};

let state: TestState;

const assertHttpError = async (
  action: () => Promise<unknown>,
  statusCode: number,
  code: string,
) => {
  await assert.rejects(
    action,
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === statusCode &&
      error.code === code,
  );
};

before(async () => {
  const superAdmin = await prisma.user.create({
    data: {
      fullName: "Analytics Super Admin",
      email: `${testId}-super@sucasa.test`,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "Analytics Admin",
      email: `${testId}-admin@sucasa.test`,
      passwordHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: "Analytics Manager",
      email: `${testId}-manager@sucasa.test`,
      passwordHash,
      role: UserRole.MANAGER,
      createdByUserId: admin.id,
    },
  });

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

  await prisma.propertyAssignment.createMany({
    data: [
      {
        propertyId: property.id,
        userId: admin.id,
        role: PropertyAssignmentRole.ADMIN,
        assignedByUserId: superAdmin.id,
        primaryAdminPropertyId: property.id,
      },
      {
        propertyId: property.id,
        userId: manager.id,
        role: PropertyAssignmentRole.MANAGER,
        assignedByUserId: admin.id,
      },
    ],
  });

  state = {
    superAdminId: superAdmin.id,
    adminId: admin.id,
    managerId: manager.id,
    tenantId: tenant.id,
    propertyId: property.id,
  };
});

after(async () => {
  if (state !== undefined) {
    await prisma.property.deleteMany({
      where: {
        id: state.propertyId,
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
      where: {
        id: state.tenantId,
      },
    });
  }

  await prisma.$disconnect();
});

test("getReportingAnalytics handles empty stats correctly", async () => {
  const result = await reportingService.getReportingAnalytics(state.superAdminId, {
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-06-07"),
    propertyId: state.propertyId,
  });

  assert.ok(result.occupancy.length > 0);
  assert.equal(result.occupancy[0]?.occupiedNights, 0);
  assert.equal(result.revenue[0]?.netRevenue, 0);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0]?.count, 0);
  assert.equal(result.conversions.totalBookings, 0);
});

test("getReportingAnalytics blocks access to unassigned property for scoped users", async () => {
  // Try querying a non-existent random UUID property
  await assertHttpError(
    () =>
      reportingService.getReportingAnalytics(state.adminId, {
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-06-07"),
        propertyId: "00000000-0000-0000-0000-000000000000",
      }),
    403,
    "FORBIDDEN",
  );
});
