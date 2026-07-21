import { expect, type APIRequestContext } from "playwright/test";
import { e2eFixture } from "./fixtures.js";

export const apiPrefix = "/api/v1";

export const futureDate = (daysFromToday: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
};

export const publicHeaders = {
  "x-tenant-slug": e2eFixture.tenant.slug,
  "x-property-slug": e2eFixture.property.slug,
};

export const loginDashboard = async (
  request: APIRequestContext,
  credentials: { email: string; password: string },
) => {
  const response = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "dashboard" },
    data: credentials,
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data: { accessToken: string; user: { role: string } };
  };
  return body.data;
};

export const bearerHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "x-app-client": "dashboard",
});

export const getRoomAvailabilityOption = async (
  request: APIRequestContext,
  checkIn: string,
  checkOut: string,
) => {
  const response = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: {
        checkIn,
        checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    data: {
      options: Array<{
        optionId: string;
        optionType: string;
        propertyId: string;
      }>;
    };
  };
  const option = body.data.options.find(
    (candidate) =>
      candidate.optionType === "ROOM" &&
      candidate.propertyId === e2eFixture.property.id,
  );
  expect(
    option,
    "Expected the seeded E2E room availability option",
  ).toBeTruthy();
  return option!;
};
