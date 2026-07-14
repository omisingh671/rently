import { expect, test } from "playwright/test";

import { E2E, isoDate } from "./e2e.constants.js";

test.setTimeout(60_000);

test("guest can book, pay, and access billing documents", async ({
  page,
}) => {
  const from = isoDate(2032, 1, 10);
  const to = isoDate(2032, 1, 12);
  const query = new URLSearchParams({
    from,
    to,
    city: "Hyderabad",
    guests: "2",
    comfort: "AC",
  });

  await page.goto(`${E2E.frontendUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]:visible').last().fill(E2E.guestEmail);
  await page.locator('input[name="password"]:visible').last().fill(E2E.password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page).toHaveURL(`${E2E.frontendUrl}/`);

  await page.goto(`${E2E.frontendUrl}/spaces?${query.toString()}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Find Your Stay" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Available Options" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Double Occupancy Room" })).toBeVisible();
  await expect(page.getByText(E2E.propertyName, { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).first().click();

  await expect(page).toHaveURL(`${E2E.frontendUrl}/bookings/checkout`);
  await expect(page.getByRole("heading", { name: "Guest Information" })).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill("E2E Browser Guest");
  await page.getByLabel("Email", { exact: true }).fill(E2E.guestEmail);
  await page.getByPlaceholder("9876543210").fill("9000000001");
  let bookingCreateRequests = 0;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.method() === "POST" &&
      url.pathname === "/api/v1/public/bookings"
    ) {
      bookingCreateRequests += 1;
    }
  });
  await page.getByRole("button", { name: "Continue to payment" }).dblclick();

  await expect(page).toHaveURL(/\/bookings\/[^/]+\/payment$/);
  expect(bookingCreateRequests).toBe(1);
  await expect(page.getByRole("heading", { name: "Confirm Booking" })).toBeVisible();
  await page.getByRole("link", { name: "Continue to Full Payment" }).click();

  await expect(
    page.getByRole("heading", { name: "Secure Payment Simulation" }),
  ).toBeVisible();
  await page.getByLabel("Cardholder Name").fill("E2E Browser Guest");
  await page.getByLabel("Card Number").fill("4111111111111111");
  await page.getByLabel("Expiry Date").fill("12/30");
  await page.getByLabel("CVV").fill("123");
  await page.getByRole("button", { name: "Simulate Success" }).click();

  await expect(
    page.getByRole("heading", { name: "Booking Confirmed & Secured!" }),
  ).toBeVisible();
  await expect(page.getByText("Booking Invoice", { exact: true })).toBeVisible();
  await expect(page.getByText("Receipt #1", { exact: true })).toBeVisible();

  const invoiceTile = page.locator("div.group").filter({
    has: page.getByText("Booking Invoice", { exact: true }),
  });
  const [downloadedInvoice] = await Promise.all([
    page.waitForEvent("download"),
    invoiceTile.getByRole("button").click(),
  ]);
  expect(downloadedInvoice.suggestedFilename()).toMatch(/^INV-.+\.pdf$/);

  await page.getByRole("link", { name: "View Booking Details" }).click();
  await expect(page.getByRole("heading", { name: "Booking Details" })).toBeVisible();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Billing Documents" })).toBeVisible();
  await expect(page.getByText(/Invoice \/ Issued/)).toBeVisible();
  await expect(page.getByText(/Receipt \/ Issued/)).toBeVisible();
});
