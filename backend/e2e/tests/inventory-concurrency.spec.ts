import { expect, test } from "../test.js";
import {
  apiPrefix,
  futureDate,
  getRoomAvailabilityOption,
  publicHeaders,
} from "../helpers.js";

test("public availability rejects a back-dated stay", async ({ request }) => {
  const checkIn = futureDate(-2);
  const checkOut = futureDate(-1);
  const response = await request.post(
    `${apiPrefix}/public/availability/check`,
    {
      headers: publicHeaders,
      data: { checkIn, checkOut, guests: 1, comfortOption: "NON_AC" },
    },
  );

  expect(response.status()).toBe(422);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "PAST_CHECK_IN_NOT_ALLOWED" },
  });
});

test("only one concurrent inventory lock can hold the same room", async ({
  request,
}) => {
  const checkIn = futureDate(30);
  const checkOut = futureDate(32);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const lockPayload = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
  };

  const responses = await Promise.all([
    request.post(`${apiPrefix}/public/inventory-locks`, {
      headers: publicHeaders,
      data: lockPayload,
    }),
    request.post(`${apiPrefix}/public/inventory-locks`, {
      headers: publicHeaders,
      data: lockPayload,
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
  const rejected = responses.find((response) => response.status() === 409)!;
  const rejectedBody = (await rejected.json()) as { error: { code: string } };
  expect([
    "BOOKING_OPTION_UNAVAILABLE",
    "INVENTORY_LOCK_CONFLICT",
    "SPACE_NOT_AVAILABLE",
  ]).toContain(rejectedBody.error.code);
});

test("only one concurrent booking can reserve the same room", async ({
  request,
}) => {
  const checkIn = futureDate(45);
  const checkOut = futureDate(47);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const bookingPayload = (sequence: number) => ({
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
    guestDetails: {
      name: `Concurrency Guest ${sequence}`,
      email: `concurrency-${sequence}@e2e.rently.test`,
      contactNumber: `900000000${sequence}`,
    },
  });

  const responses = await Promise.all([
    request.post(`${apiPrefix}/public/bookings`, {
      headers: publicHeaders,
      data: bookingPayload(1),
    }),
    request.post(`${apiPrefix}/public/bookings`, {
      headers: publicHeaders,
      data: bookingPayload(2),
    }),
  ]);

  expect(responses.map((response) => response.status()).sort()).toEqual([
    201, 409,
  ]);
  const created = responses.find((response) => response.status() === 201)!;
  await expect(created.json()).resolves.toMatchObject({
    data: { status: "PENDING" },
  });
});
