import { expect, test } from "playwright/test";

import { E2E, isoDate } from "./e2e.constants.js";

test("availability exposes an API failure and succeeds on retry", async ({
  page,
}) => {
  let failNextAvailabilityRequest = true;
  await page.route("**/api/v1/public/availability/check", async (route) => {
    if (failNextAvailabilityRequest) {
      failNextAvailabilityRequest = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "E2E_FAILURE", message: "Temporary availability failure" },
        }),
      });
      return;
    }
    await route.continue();
  });

  const query = new URLSearchParams({
    from: isoDate(2032, 2, 10),
    to: isoDate(2032, 2, 12),
    city: "Hyderabad",
    guests: "2",
    comfort: "AC",
  });
  await page.goto(`${E2E.frontendUrl}/spaces?${query.toString()}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Unable to check availability" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Available Options" })).toBeVisible();
});

test("manager token cannot read an unassigned property", async ({ page }) => {
  await page.goto(`${E2E.dashboardUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]:visible').fill(E2E.managerEmail);
  await page.locator('input[name="password"]:visible').fill(E2E.password);

  const [loginResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/api/v1/auth/login",
    ),
    page.getByRole("button", { name: "Sign in" }).last().click(),
  ]);
  const loginBody = (await loginResponse.json()) as {
    data: { accessToken: string };
  };

  const response = await page.request.get(
    `${E2E.backendUrl}/api/v1/properties/${E2E.otherPropertyId}/bookings?page=1&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${loginBody.data.accessToken}`,
        "X-App-Client": "dashboard",
      },
    },
  );
  expect(response.status()).toBe(404);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "PROPERTY_NOT_FOUND" },
  });
});
