import { request as playwrightRequest } from "playwright/test";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  loginDashboard,
} from "../helpers.js";
import { loginDashboardPage } from "./browser-helpers.js";
import { expect, test } from "playwright/test";

const backendUrl = "http://127.0.0.1:4100";

const createBooking = async () => {
  const request = await playwrightRequest.newContext({ baseURL: backendUrl });

  try {
    const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
    const headers = bearerHeaders(frontDesk.accessToken);
    const from = futureDate(2);
    const to = futureDate(3);
    const availabilityResponse = await request.post(
      `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
      {
        headers,
        data: { from, to, guests: 1, comfortOption: "NON_AC" },
      },
    );
    expect(availabilityResponse.status()).toBe(200);
    const availabilityBody = (await availabilityResponse.json()) as {
      data: {
        items: Array<{ bookingOptionId: string; available: boolean }>;
      };
    };
    const option = availabilityBody.data.items.find((item) => item.available);
    expect(option, "Expected an available seeded room").toBeTruthy();
    if (!option) throw new Error("Expected an available seeded room");

    const createResponse = await request.post(
      `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
      {
        headers,
        data: {
          bookingOptionId: option.bookingOptionId,
          from,
          to,
          guests: 1,
          comfortOption: "NON_AC",
          guestName: "Gate Zero Browser Guest",
          guestEmail: "gate0-browser@e2e.rently.test",
          countryCode: "+91",
          contactNumber: "9000000040",
          internalNotes: "Gate 0 browser smoke fixture",
        },
      },
    );
    expect(createResponse.status()).toBe(201);
    const createBody = (await createResponse.json()) as {
      data: { id: string; bookingRef: string };
    };
    return createBody.data;
  } finally {
    await request.dispose();
  }
};

test("Front Desk can open its core operations routes", async ({ page }) => {
  await loginDashboardPage(page, e2eFixture.users.frontDesk);

  await page.goto("/front-desk");
  await expect(
    page.getByRole("heading", { name: "Front Desk" }).first(),
  ).toBeVisible();

  await page.goto("/room-board");
  await expect(
    page.getByRole("heading", { name: "Room Board" }).first(),
  ).toBeVisible();

  await page.goto("/bookings/walk-in");
  await expect(
    page.getByRole("heading", { name: "Walk-in Booking" }),
  ).toBeVisible();
});

test("Accountant cannot see or directly enter Front Desk routes", async ({
  page,
}) => {
  await loginDashboardPage(page, e2eFixture.users.accountant);

  await expect(page.getByRole("link", { name: "Front Desk" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Room Board" })).toHaveCount(0);

  for (const path of ["/front-desk", "/room-board", "/bookings/walk-in"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "403 — Forbidden" }),
    ).toBeVisible();
  }
});

test("booking list and details load for an API-created booking", async ({
  page,
}) => {
  const booking = await createBooking();
  await loginDashboardPage(page, e2eFixture.users.frontDesk);

  await page.goto("/bookings");
  await expect(
    page.getByText(booking.bookingRef, { exact: true }),
  ).toBeVisible();

  await page.goto(`/bookings/${booking.id}`);
  await expect(
    page.getByRole("heading", { name: booking.bookingRef }),
  ).toBeVisible();
});
