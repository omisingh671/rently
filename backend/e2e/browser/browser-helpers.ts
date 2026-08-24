import { expect, type Page } from "playwright/test";

export const loginDashboardPage = async (
  page: Page,
  credentials: { email: string; password: string },
) => {
  await page.goto("/login");
  await page.locator('input[name="email"]:visible').fill(credentials.email);
  await page
    .locator('input[name="password"]:visible')
    .fill(credentials.password);
  await page.locator('button[type="submit"]:visible').click();
  await expect(page).toHaveURL(/\/dashboard$/);
};
