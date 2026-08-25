import { randomUUID } from "node:crypto";
import { expect, test } from "../test.js";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";

const uniqueEmail = (label: string) =>
  `${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${randomUUID()}@e2e.rently.test`;

const createUserPayload = (label: string) => ({
  fullName: `E2E ${label}`,
  email: uniqueEmail(label.toLowerCase()),
  password: "E2ePassword!123",
});

test("legacy user creation only permits Super Admin to create an Admin", async ({
  request,
}) => {
  const superAdmin = await loginDashboard(request, e2eFixture.users.superAdmin);
  const headers = bearerHeaders(superAdmin.accessToken);
  const adminPayload = createUserPayload("Legacy Admin");

  const createAdmin = await request.post(`${apiPrefix}/users`, {
    headers,
    data: { ...adminPayload, role: "ADMIN" },
  });
  expect(createAdmin.status()).toBe(201);
  const created = (await createAdmin.json()) as {
    data: { id: string; role: string; createdByUserId: string | null };
  };
  expect(created.data).toMatchObject({
    role: "ADMIN",
    createdByUserId: e2eFixture.users.superAdmin.id,
  });

  const createManager = await request.post(`${apiPrefix}/users`, {
    headers,
    data: { ...createUserPayload("Legacy Manager"), role: "MANAGER" },
  });
  expect(createManager.status()).toBe(400);
  await expect(createManager.json()).resolves.toMatchObject({
    error: { code: "VALIDATION_ERROR" },
  });

  for (const protectedField of [{ role: "SUPER_ADMIN" }, { isActive: false }]) {
    const bypassAttempt = await request.patch(
      `${apiPrefix}/users/${created.data.id}`,
      { headers, data: protectedField },
    );
    expect(bypassAttempt.status()).toBe(400);
    await expect(bypassAttempt.json()).resolves.toMatchObject({
      error: { code: "NO_VALID_FIELDS_TO_UPDATE" },
    });
  }

  const selfDelete = await request.delete(
    `${apiPrefix}/users/${e2eFixture.users.superAdmin.id}`,
    { headers },
  );
  expect(selfDelete.status()).toBe(400);
  await expect(selfDelete.json()).resolves.toMatchObject({
    error: { code: "SELF_DISABLE_NOT_ALLOWED" },
  });

  const login = await loginDashboard(request, adminPayload);
  expect(login.user.role).toBe("ADMIN");
});

test("scoped creation routes enforce the user hierarchy", async ({
  request,
}) => {
  const superAdmin = await loginDashboard(request, e2eFixture.users.superAdmin);
  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const superHeaders = bearerHeaders(superAdmin.accessToken);
  const adminHeaders = bearerHeaders(admin.accessToken);

  const scopedAdmin = await request.post(`${apiPrefix}/users/admins`, {
    headers: superHeaders,
    data: createUserPayload("Scoped Admin"),
  });
  expect(scopedAdmin.status()).toBe(201);
  await expect(scopedAdmin.json()).resolves.toMatchObject({
    data: {
      role: "ADMIN",
      createdByUserId: e2eFixture.users.superAdmin.id,
    },
  });

  for (const role of ["MANAGER", "FRONT_DESK", "ACCOUNTANT"] as const) {
    const teamUser = await request.post(`${apiPrefix}/users/team`, {
      headers: adminHeaders,
      data: { ...createUserPayload(role), role },
    });
    expect(teamUser.status()).toBe(201);
    await expect(teamUser.json()).resolves.toMatchObject({
      data: { role, createdByUserId: e2eFixture.users.admin.id },
    });
  }

  const superCreatesTeam = await request.post(`${apiPrefix}/users/team`, {
    headers: superHeaders,
    data: { ...createUserPayload("Super Team"), role: "MANAGER" },
  });
  expect(superCreatesTeam.status()).toBe(403);

  const adminCreatesAdmin = await request.post(`${apiPrefix}/users/admins`, {
    headers: adminHeaders,
    data: createUserPayload("Admin Admin"),
  });
  expect(adminCreatesAdmin.status()).toBe(403);

  for (const credentials of [
    e2eFixture.users.manager,
    e2eFixture.users.frontDesk,
    e2eFixture.users.accountant,
  ]) {
    const lowerRole = await loginDashboard(request, credentials);
    const lowerHeaders = bearerHeaders(lowerRole.accessToken);

    const createAdmin = await request.post(`${apiPrefix}/users/admins`, {
      headers: lowerHeaders,
      data: createUserPayload("Lower Admin"),
    });
    expect(createAdmin.status()).toBe(403);

    const createTeam = await request.post(`${apiPrefix}/users/team`, {
      headers: lowerHeaders,
      data: { ...createUserPayload("Lower Team"), role: "FRONT_DESK" },
    });
    expect(createTeam.status()).toBe(403);
  }
});

test("only Super Admin can manage sessions and current-session protection works", async ({
  request,
}) => {
  const targetPayload = createUserPayload("Session Target");
  const initialSuperAdmin = await loginDashboard(
    request,
    e2eFixture.users.superAdmin,
  );
  const createTarget = await request.post(`${apiPrefix}/users/admins`, {
    headers: bearerHeaders(initialSuperAdmin.accessToken),
    data: targetPayload,
  });
  expect(createTarget.status()).toBe(201);
  const target = (await createTarget.json()) as { data: { id: string } };

  const targetLogin = await loginDashboard(request, targetPayload);
  const targetHeaders = bearerHeaders(targetLogin.accessToken);
  const deniedList = await request.get(`${apiPrefix}/sessions`, {
    headers: targetHeaders,
  });
  expect(deniedList.status()).toBe(403);

  const deniedRevoke = await request.delete(
    `${apiPrefix}/sessions/00000000-0000-4000-8000-999999999999`,
    { headers: targetHeaders },
  );
  expect(deniedRevoke.status()).toBe(403);

  const currentSuperAdmin = await loginDashboard(
    request,
    e2eFixture.users.superAdmin,
  );
  const superHeaders = bearerHeaders(currentSuperAdmin.accessToken);

  const superSessions = await request.get(`${apiPrefix}/sessions`, {
    headers: superHeaders,
    params: { userId: e2eFixture.users.superAdmin.id, page: 1, limit: 100 },
  });
  expect(superSessions.status()).toBe(200);
  const superSessionBody = (await superSessions.json()) as {
    data: { items: Array<{ id: string; isCurrent: boolean }> };
  };
  const currentSession = superSessionBody.data.items.find(
    (session) => session.isCurrent,
  );
  expect(
    currentSession,
    "Expected the refresh-cookie session to be current",
  ).toBeTruthy();

  const revokeCurrent = await request.delete(
    `${apiPrefix}/sessions/${currentSession!.id}`,
    { headers: superHeaders },
  );
  expect(revokeCurrent.status()).toBe(400);
  await expect(revokeCurrent.json()).resolves.toMatchObject({
    error: { code: "CURRENT_SESSION_REVOKE_NOT_ALLOWED" },
  });

  const revokeOtherOwnSessions = await request.delete(
    `${apiPrefix}/users/${e2eFixture.users.superAdmin.id}/sessions`,
    { headers: superHeaders },
  );
  expect(revokeOtherOwnSessions.status()).toBe(204);

  const currentAccessSurvives = await request.get(`${apiPrefix}/auth/me`, {
    headers: superHeaders,
  });
  expect(currentAccessSurvives.status()).toBe(200);

  const olderAccessIsRevoked = await request.get(`${apiPrefix}/auth/me`, {
    headers: bearerHeaders(initialSuperAdmin.accessToken),
  });
  expect(olderAccessIsRevoked.status()).toBe(401);

  const targetSessions = await request.get(`${apiPrefix}/sessions`, {
    headers: superHeaders,
    params: { userId: target.data.id, page: 1, limit: 10 },
  });
  expect(targetSessions.status()).toBe(200);
  const targetSessionBody = (await targetSessions.json()) as {
    data: { items: Array<{ id: string; isCurrent: boolean }> };
  };
  expect(targetSessionBody.data.items).toHaveLength(1);
  expect(targetSessionBody.data.items[0]?.isCurrent).toBe(false);

  const revokeTarget = await request.delete(
    `${apiPrefix}/sessions/${targetSessionBody.data.items[0]!.id}`,
    { headers: superHeaders },
  );
  expect(revokeTarget.status()).toBe(204);

  const revokedAccess = await request.get(`${apiPrefix}/auth/me`, {
    headers: targetHeaders,
  });
  expect(revokedAccess.status()).toBe(401);
  await expect(revokedAccess.json()).resolves.toMatchObject({
    error: { code: "UNAUTHORIZED", message: "Session has been revoked" },
  });
});
