import { expect, test } from "playwright/test";
import { futureDate } from "../helpers.js";

test("public app loads tenant configuration and availability", async ({
  page,
}) => {
  const tenantConfigResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/public/tenant-config") &&
      response.request().method() === "GET",
  );
  const availabilityResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/public/availability/check") &&
      response.request().method() === "POST",
  );
  const search = new URLSearchParams({
    from: futureDate(2),
    to: futureDate(3),
    guests: "1",
    comfort: "NON_AC",
  });

  await page.goto(`/spaces?${search.toString()}`);

  await expect(
    page.getByRole("heading", { name: "Find Your Stay" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Available Options" }),
  ).toBeVisible();
  expect((await tenantConfigResponse).status()).toBe(200);
  expect((await availabilityResponse).status()).toBe(200);
  await expect(
    page.getByText(/Request failed|Network Error|AxiosError/i),
  ).toHaveCount(0);
});
