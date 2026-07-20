import { expect, test } from "../test.js";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";

test("all dashboard staff roles can authenticate but a guest cannot", async ({
  request,
}) => {
  const expectedRoles = [
    [e2eFixture.users.superAdmin, "SUPER_ADMIN"],
    [e2eFixture.users.admin, "ADMIN"],
    [e2eFixture.users.manager, "MANAGER"],
    [e2eFixture.users.frontDesk, "FRONT_DESK"],
    [e2eFixture.users.accountant, "ACCOUNTANT"],
  ] as const;

  for (const [credentials, role] of expectedRoles) {
    const auth = await loginDashboard(request, credentials);
    expect(auth.user.role).toBe(role);
  }

  const guestResponse = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "dashboard" },
    data: e2eFixture.users.guest,
  });
  expect(guestResponse.status()).toBe(403);
  await expect(guestResponse.json()).resolves.toMatchObject({
    error: { code: "APP_ROLE_FORBIDDEN" },
  });
});

test("property assignments prevent cross-property data access", async ({
  request,
}) => {
  const accountant = await loginDashboard(request, e2eFixture.users.accountant);
  const headers = bearerHeaders(accountant.accessToken);

  const assigned = await request.get(
    `${apiPrefix}/properties/${e2eFixture.property.id}`,
    { headers },
  );
  expect(assigned.status()).toBe(200);

  const outOfScope = await request.get(
    `${apiPrefix}/properties/${e2eFixture.outOfScopeProperty.id}`,
    { headers },
  );
  expect(outOfScope.status()).toBe(404);
  await expect(outOfScope.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });
});

test("front desk and accountant permissions remain separated", async ({
  request,
}) => {
  const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
  const accountant = await loginDashboard(request, e2eFixture.users.accountant);
  const unknownBookingId = "00000000-0000-4000-8000-999999999999";

  const frontDeskRefund = await request.post(
    `${apiPrefix}/bookings/${unknownBookingId}/refunds`,
    { headers: bearerHeaders(frontDesk.accessToken), data: {} },
  );
  expect(frontDeskRefund.status()).toBe(403);

  const accountantCheckIn = await request.post(
    `${apiPrefix}/bookings/${unknownBookingId}/check-in`,
    { headers: bearerHeaders(accountant.accessToken), data: {} },
  );
  expect(accountantCheckIn.status()).toBe(403);

  const accountantRoomBoard = await request.get(
    `${apiPrefix}/properties/${e2eFixture.property.id}/room-board`,
    {
      headers: bearerHeaders(accountant.accessToken),
      params: { from: "2026-07-20", to: "2026-07-21" },
    },
  );
  expect(accountantRoomBoard.status()).toBe(200);

  const frontDeskAnalytics = await request.get(
    `${apiPrefix}/reporting/analytics`,
    {
      headers: bearerHeaders(frontDesk.accessToken),
      params: {
        startDate: "2026-07-20",
        endDate: "2026-07-20",
        propertyId: e2eFixture.property.id,
      },
    },
  );
  expect(frontDeskAnalytics.status()).toBe(403);

  const accountantDailyCloses = await request.get(
    `${apiPrefix}/reporting/properties/${e2eFixture.property.id}/daily-closes`,
    {
      headers: bearerHeaders(accountant.accessToken),
      params: { startDate: "2026-07-01", endDate: "2026-07-20" },
    },
  );
  expect(accountantDailyCloses.status()).toBe(200);
});
