import crypto from "node:crypto";
import { hash } from "bcrypt";
import {
  request as playwrightRequest,
  type APIRequestContext,
  type APIResponse,
} from "playwright/test";
import { E2E_DEFAULTS } from "../../src/common/constants/application.constants.js";
import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders } from "../helpers.js";
import { expect, test } from "../test.js";

const dashboardCookieName = "dashboardRefreshToken";

const getCookieValue = (response: APIResponse, cookieName: string) => {
  const setCookie = response.headers()["set-cookie"];
  if (!setCookie) throw new Error(`Missing ${cookieName} response cookie`);
  const match = new RegExp(`${cookieName}=([^;]+)`).exec(setCookie);
  expect(match).toBeTruthy();
  return decodeURIComponent(match![1]!);
};

const loginDashboardResponse = (request: APIRequestContext) =>
  request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "dashboard" },
    data: e2eFixture.users.manager,
  });

test("refresh rotation stores only a hash and revokes the session on token replay", async ({
  request,
}) => {
  const login = await loginDashboardResponse(request);
  expect(login.status()).toBe(200);
  const firstRefreshToken = getCookieValue(login, dashboardCookieName);
  const loginBody = (await login.json()) as {
    data: { accessToken: string };
  };

  const storedSession = await prisma.session.findFirstOrThrow({
    where: { userId: e2eFixture.users.manager.id, audience: "DASHBOARD" },
    orderBy: { createdAt: "desc" },
  });
  expect(storedSession.refreshToken).not.toBe(firstRefreshToken);
  expect(storedSession.refreshToken).toMatch(/^[a-f0-9]{64}$/);

  const refresh = await request.post(`${apiPrefix}/auth/refresh`, {
    headers: {
      "x-app-client": "dashboard",
      Cookie: `${dashboardCookieName}=${firstRefreshToken}`,
    },
  });
  expect(refresh.status()).toBe(200);
  const nextRefreshToken = getCookieValue(refresh, dashboardCookieName);
  expect(nextRefreshToken).not.toBe(firstRefreshToken);
  const refreshBody = (await refresh.json()) as {
    data: { accessToken: string };
  };

  const replayContext = await playwrightRequest.newContext({
    baseURL: `http://127.0.0.1:${E2E_DEFAULTS.port}`,
  });
  try {
    const replay = await replayContext.post(`${apiPrefix}/auth/refresh`, {
      headers: {
        "x-app-client": "dashboard",
        Cookie: `${dashboardCookieName}=${firstRefreshToken}`,
      },
    });
    expect(replay.status()).toBe(401);
    await expect(replay.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED", message: "Invalid refresh token" },
    });

    const revokedRefresh = await replayContext.post(
      `${apiPrefix}/auth/refresh`,
      {
        headers: {
          "x-app-client": "dashboard",
          Cookie: `${dashboardCookieName}=${nextRefreshToken}`,
        },
      },
    );
    expect(revokedRefresh.status()).toBe(401);
  } finally {
    await replayContext.dispose();
  }

  const revokedAccess = await request.get(`${apiPrefix}/auth/me`, {
    headers: bearerHeaders(refreshBody.data.accessToken),
  });
  expect(revokedAccess.status()).toBe(401);
  await expect(revokedAccess.json()).resolves.toMatchObject({
    error: { code: "UNAUTHORIZED", message: "Session has been revoked" },
  });

  const originalAccess = await request.get(`${apiPrefix}/auth/me`, {
    headers: bearerHeaders(loginBody.data.accessToken),
  });
  expect(originalAccess.status()).toBe(401);
});

test("existing raw refresh-token rows rotate into hashed storage", async ({
  request,
}) => {
  const login = await loginDashboardResponse(request);
  expect(login.status()).toBe(200);
  const refreshToken = getCookieValue(login, dashboardCookieName);
  const session = await prisma.session.findFirstOrThrow({
    where: { userId: e2eFixture.users.manager.id, audience: "DASHBOARD" },
    orderBy: { createdAt: "desc" },
  });
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken },
  });

  const refresh = await request.post(`${apiPrefix}/auth/refresh`, {
    headers: {
      "x-app-client": "dashboard",
      Cookie: `${dashboardCookieName}=${refreshToken}`,
    },
  });
  expect(refresh.status()).toBe(200);
  const rotated = await prisma.session.findUniqueOrThrow({
    where: { id: session.id },
  });
  expect(rotated.refreshToken).not.toBe(refreshToken);
  expect(rotated.refreshToken).toMatch(/^[a-f0-9]{64}$/);
});

test("untrusted browser origins cannot submit cookie-auth requests", async ({
  request,
}) => {
  const login = await loginDashboardResponse(request);
  expect(login.status()).toBe(200);
  const refreshToken = getCookieValue(login, dashboardCookieName);

  const rejected = await request.post(`${apiPrefix}/auth/refresh`, {
    headers: {
      "x-app-client": "dashboard",
      Origin: "https://attacker.rently.test",
      Cookie: `${dashboardCookieName}=${refreshToken}`,
    },
  });
  expect(rejected.status()).toBe(403);
  await expect(rejected.json()).resolves.toMatchObject({
    error: { code: "ORIGIN_FORBIDDEN" },
  });

  const allowed = await request.post(`${apiPrefix}/auth/refresh`, {
    headers: {
      "x-app-client": "dashboard",
      Origin: "http://localhost:5173",
      Cookie: `${dashboardCookieName}=${refreshToken}`,
    },
  });
  expect(allowed.status()).toBe(200);
});

test("a password reset token can be consumed only once under concurrency", async ({
  request,
}) => {
  const userId = "00000000-0000-4000-8000-000000000190";
  const email = "reset-race@e2e.rently.test";
  const originalPassword = "OriginalPassword!123";
  const firstPassword = "FirstResetPassword!123";
  const secondPassword = "SecondResetPassword!123";
  await prisma.user.create({
    data: {
      id: userId,
      fullName: "E2E Reset Race Guest",
      email,
      passwordHash: await hash(originalPassword, 10),
      role: "GUEST",
    },
  });

  const login = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "frontend" },
    data: { email, password: originalPassword },
  });
  expect(login.status()).toBe(200);
  const loginBody = (await login.json()) as {
    data: { accessToken: string };
  };

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const attempts = await Promise.all([
    request.post(`${apiPrefix}/auth/reset-password`, {
      data: { token: rawToken, password: firstPassword },
    }),
    request.post(`${apiPrefix}/auth/reset-password`, {
      data: { token: rawToken, password: secondPassword },
    }),
  ]);
  expect(attempts.map((response) => response.status()).sort()).toEqual([
    204, 400,
  ]);
  expect(
    await prisma.passwordResetToken.count({ where: { userId } }),
  ).toBe(0);
  expect(await prisma.session.count({ where: { userId } })).toBe(0);

  const revokedAccess = await request.get(`${apiPrefix}/auth/me`, {
    headers: {
      Authorization: `Bearer ${loginBody.data.accessToken}`,
      "x-app-client": "frontend",
    },
  });
  expect(revokedAccess.status()).toBe(401);

  const winningPassword =
    attempts[0]!.status() === 204 ? firstPassword : secondPassword;
  const losingPassword =
    attempts[0]!.status() === 204 ? secondPassword : firstPassword;
  const winnerLogin = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "frontend" },
    data: { email, password: winningPassword },
  });
  expect(winnerLogin.status()).toBe(200);
  const loserLogin = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "frontend" },
    data: { email, password: losingPassword },
  });
  expect(loserLogin.status()).toBe(401);
});
