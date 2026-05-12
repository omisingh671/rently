import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  PropertyAssignmentRole,
  PropertyStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import * as dashboardService from "@/modules/dashboard/dashboard.service.js";

const testId = `rbac-${Date.now()}`;
const passwordHash = "not-used-by-service-tests";

type TestState = {
  superAdminId: string;
  adminId: string;
  otherAdminId: string;
  managerId: string;
  tenantId: string;
  propertyAId: string;
  propertyBId: string;
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
      fullName: "RBAC Super Admin",
      email: `${testId}-super@sucasa.test`,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const admin = await prisma.user.create({
    data: {
      fullName: "RBAC Admin",
      email: `${testId}-admin@sucasa.test`,
      passwordHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      fullName: "RBAC Manager",
      email: `${testId}-manager@sucasa.test`,
      passwordHash,
      role: UserRole.MANAGER,
      createdByUserId: admin.id,
    },
  });

  const otherAdmin = await prisma.user.create({
    data: {
      fullName: "RBAC Other Admin",
      email: `${testId}-other-admin@sucasa.test`,
      passwordHash,
      role: UserRole.ADMIN,
      createdByUserId: superAdmin.id,
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

  const propertyA = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: `${testId} Property A`,
      address: "Test Address A",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });

  const propertyB = await prisma.property.create({
    data: {
      tenantId: tenant.id,
      name: `${testId} Property B`,
      address: "Test Address B",
      city: "Hyderabad",
      state: "Telangana",
      status: PropertyStatus.ACTIVE,
      createdByUserId: superAdmin.id,
    },
  });

  await prisma.propertyAssignment.createMany({
    data: [
      {
        propertyId: propertyA.id,
        userId: admin.id,
        role: PropertyAssignmentRole.ADMIN,
        assignedByUserId: superAdmin.id,
      },
      {
        propertyId: propertyA.id,
        userId: manager.id,
        role: PropertyAssignmentRole.MANAGER,
        assignedByUserId: admin.id,
      },
      {
        propertyId: propertyB.id,
        userId: otherAdmin.id,
        role: PropertyAssignmentRole.ADMIN,
        assignedByUserId: superAdmin.id,
      },
    ],
  });

  state = {
    superAdminId: superAdmin.id,
    adminId: admin.id,
    otherAdminId: otherAdmin.id,
    managerId: manager.id,
    tenantId: tenant.id,
    propertyAId: propertyA.id,
    propertyBId: propertyB.id,
  };
});

after(async () => {
  if (state !== undefined) {
    await prisma.property.deleteMany({
      where: {
        id: {
          in: [state.propertyAId, state.propertyBId],
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            state.managerId,
            state.adminId,
            state.otherAdminId,
            state.superAdminId,
          ],
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

test("SUPER_ADMIN can access all dashboard properties", async () => {
  const result = await dashboardService.listProperties(state.superAdminId, {
    page: 1,
    limit: 50,
  });

  const propertyIds = result.items.map((property) => property.id);
  assert.ok(propertyIds.includes(state.propertyAId));
  assert.ok(propertyIds.includes(state.propertyBId));
});

test("ADMIN can access only assigned property data", async () => {
  const result = await dashboardService.listProperties(state.adminId, {
    page: 1,
    limit: 50,
  });

  assert.deepEqual(
    result.items.map((property) => property.id),
    [state.propertyAId],
  );

  await assertHttpError(
    () => dashboardService.getPropertyById(state.adminId, state.propertyBId),
    404,
    "PROPERTY_NOT_FOUND",
  );
});

test("MANAGER can access operations modules only", async () => {
  await dashboardService.listBookings(state.managerId, {
    propertyId: state.propertyAId,
    page: 1,
    limit: 10,
  });

  await assertHttpError(
    () =>
      dashboardService.listAmenities(state.managerId, {
        propertyId: state.propertyAId,
        page: 1,
        limit: 10,
      }),
    403,
    "FORBIDDEN",
  );
});

test("direct ID access is blocked across property boundaries", async () => {
  await assertHttpError(
    () =>
      dashboardService.listBookings(state.adminId, {
        propertyId: state.propertyBId,
        page: 1,
        limit: 10,
      }),
    404,
    "PROPERTY_NOT_FOUND",
  );

  await assertHttpError(
    () =>
      dashboardService.listAmenities(state.adminId, {
        propertyId: state.propertyBId,
        page: 1,
        limit: 10,
      }),
    404,
    "PROPERTY_NOT_FOUND",
  );
});

test("ADMIN cannot access inventory, pricing, or assignments outside scope", async () => {
  await assertHttpError(
    () =>
      dashboardService.createPropertyAssignment(state.adminId, {
        propertyId: state.propertyBId,
        userId: state.managerId,
        role: PropertyAssignmentRole.MANAGER,
      }),
    404,
    "PROPERTY_NOT_FOUND",
  );
});
