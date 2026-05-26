import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { hashPassword } from "@/common/utils/password.js";
import { prisma } from "@/db/prisma.js";
import {
  PropertyAssignmentRole,
  PropertyStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import * as authService from "@/modules/auth/auth.service.js";
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
        primaryAdminPropertyId: propertyA.id,
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
        primaryAdminPropertyId: propertyB.id,
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

    await prisma.amenity.deleteMany({
      where: {
        name: {
          startsWith: `${testId} `,
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
        page: 1,
        limit: 10,
      }),
    403,
    "FORBIDDEN",
  );
});

test("amenity catalog is global and managed by SUPER_ADMIN only", async () => {
  const amenity = await dashboardService.createAmenity(state.superAdminId, {
    name: `${testId} Catalog WiFi`,
    icon: "wifi",
  });

  const listResult = await dashboardService.listAmenities(state.adminId, {
    page: 1,
    limit: 50,
  });
  assert.ok(listResult.items.some((item) => item.id === amenity.id));

  await assertHttpError(
    () =>
      dashboardService.createAmenity(state.adminId, {
        name: `${testId} Pool`,
        icon: "waves",
      }),
    403,
    "FORBIDDEN",
  );

  await assertHttpError(
    () =>
      dashboardService.updateAmenity(state.adminId, amenity.id, {
        name: `${testId} Fast WiFi`,
      }),
    403,
    "FORBIDDEN",
  );
});

test("property amenity assignments are scoped to assigned properties", async () => {
  const amenity = await dashboardService.createAmenity(state.superAdminId, {
    name: `${testId} Assignment WiFi`,
    icon: "wifi",
  });

  const assigned =
    await dashboardService.replacePropertyAmenityAssignments(
      state.adminId,
      state.propertyAId,
      {
        amenityIds: [amenity.id],
      },
    );

  assert.deepEqual(assigned.amenityIds, [amenity.id]);

  const reloaded = await dashboardService.getPropertyAmenityAssignments(
    state.adminId,
    state.propertyAId,
  );
  assert.deepEqual(reloaded.amenityIds, [amenity.id]);

  await assertHttpError(
    () =>
      dashboardService.replacePropertyAmenityAssignments(
        state.adminId,
        state.propertyBId,
        {
          amenityIds: [amenity.id],
        },
      ),
    404,
    "PROPERTY_NOT_FOUND",
  );
});

test("property amenity assignments reject inactive amenities", async () => {
  const amenity = await dashboardService.createAmenity(state.superAdminId, {
    name: `${testId} Inactive Amenity`,
    icon: "wifi",
  });

  await dashboardService.updateAmenity(state.superAdminId, amenity.id, {
    isActive: false,
  });

  await assertHttpError(
    () =>
      dashboardService.replacePropertyAmenityAssignments(
        state.adminId,
        state.propertyAId,
        {
          amenityIds: [amenity.id],
        },
      ),
    400,
    "INVALID_AMENITIES",
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

test("property can have only one primary admin assignment", async () => {
  await assertHttpError(
    () =>
      dashboardService.createPropertyAssignment(state.superAdminId, {
        propertyId: state.propertyAId,
        userId: state.otherAdminId,
        role: PropertyAssignmentRole.ADMIN,
      }),
    409,
    "PROPERTY_ADMIN_EXISTS",
  );

  await assert.rejects(() =>
    prisma.propertyAssignment.create({
      data: {
        propertyId: state.propertyAId,
        userId: state.otherAdminId,
        role: PropertyAssignmentRole.ADMIN,
        assignedByUserId: state.superAdminId,
        primaryAdminPropertyId: state.propertyAId,
      },
    }),
  );
});

test("SUPER_ADMIN can list all users and non-super-admin roles cannot", async () => {
  const guest = await prisma.user.create({
    data: {
      fullName: "RBAC Guest",
      email: `${testId}-guest@sucasa.test`,
      passwordHash,
      role: UserRole.GUEST,
    },
  });

  const result = await dashboardService.listUsers(state.superAdminId, {
    page: 1,
    limit: 50,
    role: UserRole.GUEST,
  });

  assert.ok(result.items.some((user) => user.id === guest.id));

  await assertHttpError(
    () =>
      dashboardService.listUsers(state.adminId, {
        page: 1,
        limit: 10,
      }),
    403,
    "FORBIDDEN",
  );
});

test("SUPER_ADMIN role changes are conservative and clean incompatible assignments", async () => {
  const managedAdmin = await prisma.user.create({
    data: {
      fullName: "RBAC Managed Admin",
      email: `${testId}-managed-admin@sucasa.test`,
      passwordHash,
      role: UserRole.ADMIN,
      createdByUserId: state.superAdminId,
    },
  });

  const protectedSuperAdmin = await prisma.user.create({
    data: {
      fullName: "RBAC Protected Super Admin",
      email: `${testId}-protected-super@sucasa.test`,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  await prisma.propertyAssignment.create({
    data: {
      propertyId: state.propertyBId,
      userId: managedAdmin.id,
      role: PropertyAssignmentRole.MANAGER,
      assignedByUserId: state.superAdminId,
    },
  });

  await prisma.session.create({
    data: {
      userId: managedAdmin.id,
      refreshToken: `${testId}-managed-admin-session`,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const updated = await dashboardService.updateUserRole(
    state.superAdminId,
    managedAdmin.id,
    { role: UserRole.GUEST },
  );

  assert.equal(updated.role, UserRole.GUEST);

  const remainingAssignments = await prisma.propertyAssignment.count({
    where: { userId: managedAdmin.id },
  });
  assert.equal(remainingAssignments, 0);

  const remainingSessions = await prisma.session.count({
    where: { userId: managedAdmin.id },
  });
  assert.equal(remainingSessions, 0);

  await assertHttpError(
    () =>
      dashboardService.updateUserRole(state.superAdminId, state.superAdminId, {
        role: UserRole.ADMIN,
      }),
    400,
    "SELF_ROLE_CHANGE_NOT_ALLOWED",
  );

  await assertHttpError(
    () =>
      dashboardService.updateUserRole(
        state.superAdminId,
        protectedSuperAdmin.id,
        {
          role: UserRole.MANAGER,
        },
      ),
    403,
    "SUPER_ADMIN_ROLE_PROTECTED",
  );
});

test("SUPER_ADMIN can trigger reset tokens and manage forced password change", async () => {
  const password = "Current@12345";
  const forceUser = await prisma.user.create({
    data: {
      fullName: "RBAC Force Password",
      email: `${testId}-force-password@sucasa.test`,
      passwordHash: await hashPassword(password),
      role: UserRole.MANAGER,
      createdByUserId: state.adminId,
    },
  });

  await dashboardService.sendUserPasswordResetEmail(
    state.superAdminId,
    forceUser.id,
  );

  assert.equal(
    await prisma.passwordResetToken.count({ where: { userId: forceUser.id } }),
    1,
  );

  const updated = await dashboardService.updateForcePasswordChange(
    state.superAdminId,
    forceUser.id,
    { mustChangePassword: true },
  );
  assert.equal(updated.mustChangePassword, true);

  let nextCalled = false;
  await assert.rejects(
    () =>
      requirePasswordChangeComplete(
        {
          user: {
            userId: forceUser.id,
            role: UserRole.MANAGER,
          },
        } as AuthRequest,
        {} as never,
        () => {
          nextCalled = true;
        },
      ),
    (error: unknown) =>
      error instanceof HttpError &&
      error.statusCode === 403 &&
      error.code === "PASSWORD_CHANGE_REQUIRED",
  );
  assert.equal(nextCalled, false);

  await authService.changePassword({
    userId: forceUser.id,
    currentPassword: password,
    newPassword: "NextPassword@123",
  });

  const reloaded = await prisma.user.findUniqueOrThrow({
    where: { id: forceUser.id },
  });
  assert.equal(reloaded.mustChangePassword, false);
});

test("SUPER_ADMIN session management preserves current self session", async () => {
  const currentRefreshToken = `${testId}-current-super-session`;
  const otherRefreshToken = `${testId}-other-super-session`;
  const targetRefreshToken = `${testId}-target-session`;

  const target = await prisma.user.create({
    data: {
      fullName: "RBAC Session Target",
      email: `${testId}-session-target@sucasa.test`,
      passwordHash,
      role: UserRole.MANAGER,
      createdByUserId: state.adminId,
    },
  });

  await prisma.session.createMany({
    data: [
      {
        userId: state.superAdminId,
        refreshToken: currentRefreshToken,
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        userId: state.superAdminId,
        refreshToken: otherRefreshToken,
        expiresAt: new Date(Date.now() + 60_000),
      },
      {
        userId: target.id,
        refreshToken: targetRefreshToken,
        expiresAt: new Date(Date.now() + 60_000),
      },
    ],
  });

  const sessions = await dashboardService.listSessions(
    state.superAdminId,
    { page: 1, limit: 50 },
    currentRefreshToken,
  );

  assert.ok(
    sessions.items.some(
      (session) => session.userId === state.superAdminId && session.isCurrent,
    ),
  );

  await dashboardService.revokeUserSessions(
    state.superAdminId,
    state.superAdminId,
    currentRefreshToken,
  );

  assert.equal(
    await prisma.session.count({
      where: { refreshToken: currentRefreshToken },
    }),
    1,
  );
  assert.equal(
    await prisma.session.count({
      where: { refreshToken: otherRefreshToken },
    }),
    0,
  );

  await dashboardService.revokeUserSessions(state.superAdminId, target.id);
  assert.equal(await prisma.session.count({ where: { userId: target.id } }), 0);
});
