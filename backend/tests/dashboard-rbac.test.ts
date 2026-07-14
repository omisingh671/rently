import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { requirePasswordChangeComplete } from "@/common/middleware/password-change.middleware.js";
import { signAccessToken } from "@/common/utils/jwt.js";
import { hashPassword } from "@/common/utils/password.js";
import { prisma } from "@/db/prisma.js";
import {
  AdvancePaymentType,
  PropertyAssignmentRole,
  PropertyStatus,
  SessionAudience,
  UserRole,
} from "@/generated/prisma/client.js";
import * as authService from "@/modules/auth/auth.service.js";
import { updateBookingPolicySchema } from "@/modules/booking-policy/booking-policy.validation.js";
import * as bookingsService from "@/modules/bookings/bookings.service.js";
import * as usersService from "@/modules/users/users.service.js";
import * as sessionsService from "@/modules/sessions/sessions.service.js";
import * as propertyAssignmentsService from "@/modules/property-assignments/property-assignments.service.js";
import * as bookingPolicyService from "@/modules/booking-policy/booking-policy.service.js";
import * as amenitiesService from "@/modules/amenities/amenities.service.js";
import * as propertiesService from "@/modules/properties/properties.service.js";

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
      slug: `${testId}-property-a`,
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
      slug: `${testId}-property-b`,
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
  const result = await propertiesService.listProperties(state.superAdminId, {
    page: 1,
    limit: 50,
  });

  const propertyIds = result.items.map((property) => property.id);
  assert.ok(propertyIds.includes(state.propertyAId));
  assert.ok(propertyIds.includes(state.propertyBId));
});

test("ADMIN can access only assigned property data", async () => {
  const result = await propertiesService.listProperties(state.adminId, {
    page: 1,
    limit: 50,
  });

  assert.deepEqual(
    result.items.map((property) => property.id),
    [state.propertyAId],
  );

  await assertHttpError(
    () => propertiesService.getPropertyById(state.adminId, state.propertyBId),
    404,
    "PROPERTY_NOT_FOUND",
  );
});

test("dashboard booking policy GET does not reset saved values", async () => {
  const saved = await bookingPolicyService.updateBookingPolicy(
    state.adminId,
    state.propertyAId,
    {
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 5,
      tokenRefundable: true,
      checkInTime: "13:30",
      checkOutTime: "10:15",
      cancellationRules: {
        guestCancellationAllowed: false,
        allowedStatuses: ["PENDING"],
        beforeCheckInOnly: false,
      },
      refundRules: {
        tokenRefundable: true,
        manualReviewRequired: false,
      },
      earlyCheckoutRules: {
        refundUnusedNights: true,
        manualReviewRequired: false,
      },
      noShowRules: {
        markAfterCheckInCutoff: false,
        tokenRefundable: true,
      },
      guestPolicyText: "Dashboard edited policy text",
    },
  );

  assert.equal(saved.advancePaymentValue, "5");

  const reloaded = await bookingPolicyService.getBookingPolicy(
    state.adminId,
    state.propertyAId,
  );

  assert.equal(reloaded.advancePaymentType, AdvancePaymentType.FIXED_AMOUNT);
  assert.equal(reloaded.advancePaymentValue, "5");
  assert.equal(reloaded.tokenRefundable, true);
  assert.equal(reloaded.checkInTime, "13:30");
  assert.equal(reloaded.checkOutTime, "10:15");
  assert.equal(reloaded.cancellationRules.guestCancellationAllowed, false);
  assert.deepEqual(reloaded.cancellationRules.allowedStatuses, ["PENDING"]);
  assert.equal(reloaded.refundRules.manualReviewRequired, false);
  assert.equal(reloaded.earlyCheckoutRules.refundUnusedNights, true);
  assert.equal(reloaded.noShowRules.markAfterCheckInCutoff, false);
  assert.equal(reloaded.guestPolicyText, "Dashboard edited policy text");
});

test("dashboard booking policy validation rejects invalid stay times", () => {
  assert.throws(() =>
    updateBookingPolicySchema.parse({
      advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
      advancePaymentValue: 5,
      tokenRefundable: true,
      checkInTime: "25:00",
      checkOutTime: "10:15",
      cancellationRules: {},
      refundRules: {},
      earlyCheckoutRules: {},
      noShowRules: {},
      guestPolicyText: "Dashboard policy text",
    }),
  );
});

test("MANAGER can access operations modules only", async () => {
  await bookingsService.listBookings(state.managerId, {
    propertyId: state.propertyAId,
    page: 1,
    limit: 10,
  });

  await assertHttpError(
    () =>
      amenitiesService.listAmenities(state.managerId, {
        page: 1,
        limit: 10,
      }),
    403,
    "FORBIDDEN",
  );
});

test("MANAGER operations routes are not blocked by earlier admin-only routers", async () => {
  await import("dotenv/config");
  const { app } = await import("@/app.js");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address() as AddressInfo;
    const token = signAccessToken({
      sub: state.managerId,
      role: UserRole.MANAGER,
      audience: SessionAudience.DASHBOARD,
    });
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v1/properties/${state.propertyAId}/bookings?page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-App-Client": "dashboard",
        },
      },
    );

    assert.equal(response.status, 200);
  } finally {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
});

test("amenity catalog is global and managed by SUPER_ADMIN only", async () => {
  const amenity = await amenitiesService.createAmenity(state.superAdminId, {
    name: `${testId} Catalog WiFi`,
    icon: "wifi",
  });

  const listResult = await amenitiesService.listAmenities(state.adminId, {
    page: 1,
    limit: 50,
  });
  assert.ok(listResult.items.some((item) => item.id === amenity.id));

  await assertHttpError(
    () =>
      amenitiesService.createAmenity(state.adminId, {
        name: `${testId} Pool`,
        icon: "waves",
      }),
    403,
    "FORBIDDEN",
  );

  await assertHttpError(
    () =>
      amenitiesService.updateAmenity(state.adminId, amenity.id, {
        name: `${testId} Fast WiFi`,
      }),
    403,
    "FORBIDDEN",
  );
});

test("property amenity assignments are scoped to assigned properties", async () => {
  const amenity = await amenitiesService.createAmenity(state.superAdminId, {
    name: `${testId} Assignment WiFi`,
    icon: "wifi",
  });

  const assigned =
    await amenitiesService.replacePropertyAmenityAssignments(
      state.adminId,
      state.propertyAId,
      {
        amenityIds: [amenity.id],
      },
    );

  assert.deepEqual(assigned.amenityIds, [amenity.id]);

  const reloaded = await amenitiesService.getPropertyAmenityAssignments(
    state.adminId,
    state.propertyAId,
  );
  assert.deepEqual(reloaded.amenityIds, [amenity.id]);

  await assertHttpError(
    () =>
      amenitiesService.replacePropertyAmenityAssignments(
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
  const amenity = await amenitiesService.createAmenity(state.superAdminId, {
    name: `${testId} Inactive Amenity`,
    icon: "wifi",
  });

  await amenitiesService.updateAmenity(state.superAdminId, amenity.id, {
    isActive: false,
  });

  await assertHttpError(
    () =>
      amenitiesService.replacePropertyAmenityAssignments(
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
      bookingsService.listBookings(state.adminId, {
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
      propertyAssignmentsService.createPropertyAssignment(state.adminId, {
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
      propertyAssignmentsService.createPropertyAssignment(state.superAdminId, {
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

  const result = await usersService.listUsersForDashboard(state.superAdminId, {
    page: 1,
    limit: 50,
    role: UserRole.GUEST,
  });

  assert.ok(result.items.some((user: { id: string }) => user.id === guest.id));

  await assertHttpError(
    () =>
      usersService.listUsersForDashboard(state.adminId, {
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

  const updated = await usersService.updateUserRole(
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
      usersService.updateUserRole(state.superAdminId, state.superAdminId, {
        role: UserRole.ADMIN,
      }),
    400,
    "SELF_ROLE_CHANGE_NOT_ALLOWED",
  );

  await assertHttpError(
    () =>
      usersService.updateUserRole(
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

  await usersService.sendUserPasswordResetEmail(
    state.superAdminId,
    forceUser.id,
  );

  assert.equal(
    await prisma.passwordResetToken.count({ where: { userId: forceUser.id } }),
    1,
  );

  const updated = await usersService.updateForcePasswordChange(
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

test("auth sessions enforce frontend and dashboard audiences", async () => {
  const password = "Audience@12345";
  const passwordHashForLogin = await hashPassword(password);
  const [guest, staff] = await Promise.all([
    prisma.user.create({
      data: {
        fullName: "RBAC Audience Guest",
        email: `${testId}-audience-guest@sucasa.test`,
        passwordHash: passwordHashForLogin,
        role: UserRole.GUEST,
      },
    }),
    prisma.user.create({
      data: {
        fullName: "RBAC Audience Admin",
        email: `${testId}-audience-admin@sucasa.test`,
        passwordHash: passwordHashForLogin,
        role: UserRole.ADMIN,
        createdByUserId: state.superAdminId,
      },
    }),
  ]);

  await assertHttpError(
    () =>
      authService.loginUser(
        { email: guest.email, password },
        SessionAudience.DASHBOARD,
      ),
    403,
    "APP_ROLE_FORBIDDEN",
  );
  await assertHttpError(
    () =>
      authService.loginUser(
        { email: staff.email, password },
        SessionAudience.FRONTEND,
      ),
    403,
    "APP_ROLE_FORBIDDEN",
  );

  const guestLogin = await authService.loginUser(
    { email: guest.email, password },
    SessionAudience.FRONTEND,
  );
  const staffLogin = await authService.loginUser(
    { email: staff.email, password },
    SessionAudience.DASHBOARD,
  );

  assert.equal(
    await prisma.session.count({
      where: { userId: guest.id, audience: SessionAudience.FRONTEND },
    }),
    1,
  );
  assert.equal(
    await prisma.session.count({
      where: { userId: staff.id, audience: SessionAudience.DASHBOARD },
    }),
    1,
  );

  await assertHttpError(
    () =>
      authService.refreshSession(
        guestLogin.refreshToken,
        SessionAudience.DASHBOARD,
      ),
    401,
    "UNAUTHORIZED",
  );

  const refreshedGuest = await authService.refreshSession(
    guestLogin.refreshToken,
    SessionAudience.FRONTEND,
  );
  assert.equal(refreshedGuest.auth.user.role, UserRole.GUEST);
  assert.equal(staffLogin.auth.user.role, UserRole.ADMIN);
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

  const sessions = await sessionsService.listSessions(
    state.superAdminId,
    { page: 1, limit: 50 },
    currentRefreshToken,
  );

  assert.ok(
    sessions.items.some(
      (session) => session.userId === state.superAdminId && session.isCurrent,
    ),
  );

  await usersService.revokeUserSessions(
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

  await usersService.revokeUserSessions(state.superAdminId, target.id);
  assert.equal(await prisma.session.count({ where: { userId: target.id } }), 0);
});
