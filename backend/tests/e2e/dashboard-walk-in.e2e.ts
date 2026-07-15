import { expect, test } from "playwright/test";

import { E2E, propertyIsoDate } from "./e2e.constants.js";

test("manager can create a walk-in booking through dashboard operations", async ({
  page,
}) => {
  await page.goto(`${E2E.dashboardUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]:visible').fill(E2E.managerEmail);
  await page.locator('input[name="password"]:visible').fill(E2E.password);
  await page.getByRole("button", { name: "Sign in" }).last().click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto(`${E2E.dashboardUrl}/bookings/walk-in`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Walk-in Booking" })).toBeVisible();
  await expect(page.getByRole("button", { name: new RegExp(E2E.propertyName) })).toBeVisible();

  await page.getByLabel("Guest name", { exact: true }).fill("E2E Walk In Guest");
  await page
    .getByLabel("Guest email", { exact: true })
    .fill("walkin.browser@rently.test");
  await page.getByLabel("From", { exact: true }).fill(propertyIsoDate());
  await page.getByLabel("To", { exact: true }).fill(propertyIsoDate(1));
  await page.getByLabel("Guests", { exact: true }).fill("2");
  await page
    .getByRole("combobox", { name: "Comfort", exact: true })
    .selectOption("AC");
  await page.getByRole("button", { name: "Check availability" }).click();

  const availableOption = page.getByText("Available", { exact: true }).first();
  await expect(availableOption).toBeVisible();
  await availableOption.locator("xpath=ancestor::label").click();
  await page.getByRole("button", { name: "Create booking" }).click();

  await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByText("walkin.browser@rently.test")).toBeVisible();

  const bookingRow = page
    .locator("tr")
    .filter({ hasText: "walkin.browser@rently.test" });
  await bookingRow.getByRole("link", { name: "View Details" }).click();

  await page.getByRole("button", { name: "Record Balance Payment" }).click();
  await expect(page.getByRole("heading", { name: "Record Balance Payment" })).toBeVisible();
  await expect(page.getByLabel("Amount", { exact: true })).not.toHaveValue("0");
  await page.getByRole("button", { name: "Record Payment" }).click();
  await expect(page.getByText("Outstanding Balance Due")).toBeHidden();

  await page.getByRole("button", { name: "Extend Stay" }).click();
  await expect(page.getByRole("heading", { name: "Extend Stay" })).toBeVisible();
  await expect(page.getByLabel("New check-out")).toHaveValue(propertyIsoDate(2));
  await page.getByRole("button", { name: "Preview extension" }).click();
  await expect(page.getByText("Added nights")).toBeVisible();
  await expect(page.getByText("1", { exact: true })).toBeVisible();
  await page.getByLabel("Audit note").fill("Guest extended the stay by one night.");
  await page.getByRole("button", { name: "Confirm extension" }).click();
  await expect(page.getByText("Outstanding Balance Due")).toBeVisible();
  await page.getByRole("button", { name: "Record Balance Payment" }).click();
  await page.getByRole("button", { name: "Record Payment" }).click();
  await expect(page.getByText("Outstanding Balance Due")).toBeHidden();

  const assignmentRow = page.getByRole("row", { name: /Assigned Room\/Unit/ });
  const assignmentText = (await assignmentRow.textContent()) ?? "";
  const assignedRoomNumber = assignmentText.match(/Room (101[AB])/)?.[1];
  expect(assignedRoomNumber).toBeDefined();

  let staleVersionInjected = false;
  await page.route(/\/api\/v1\/bookings\/[^/]+\/check-in$/, async (route) => {
    if (!staleVersionInjected && route.request().method() === "POST") {
      staleVersionInjected = true;
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      await route.continue({
        postData: JSON.stringify({ ...payload, expectedVersion: 999_999 }),
      });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Check In" }).click();
  await page.getByRole("checkbox", { name: /Guest identity verified/ }).check();
  await page.getByRole("button", { name: "Confirm Check In" }).click();
  await expect(
    page.getByText("Booking was changed by another operator. Reload and try again."),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "Confirm Check In" }).click();
  await expect(page.getByText("Checked In", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Check Out" }).click();
  await page.getByRole("button", { name: "Confirm Check Out" }).click();
  await expect(page.getByText("Checked Out", { exact: true }).first()).toBeVisible();

  await page.goto(`${E2E.dashboardUrl}/room-board`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("button", { name: "Today" }).click();
  await page.getByPlaceholder("Guest, ref, room...").fill(assignedRoomNumber ?? "");
  await expect(page.getByText("Housekeeping: DIRTY")).toBeVisible();
  await page.getByRole("button", { name: "Mark Cleaning" }).click();
  await page.getByRole("button", { name: "Mark Clean", exact: true }).click();
  await page.getByRole("button", { name: "Mark Inspected" }).click();
  await expect(page.getByText("Housekeeping: INSPECTED")).toBeVisible();
});
