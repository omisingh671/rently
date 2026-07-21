import { prisma } from "../../src/db/prisma.js";
import {
  apiPrefix,
  futureDate,
  getRoomAvailabilityOption,
  publicHeaders,
} from "../helpers.js";
import { expect, test } from "../test.js";

test("a token payment confirms an online pending reservation idempotently", async ({
  request,
}) => {
  const checkIn = futureDate(70);
  const checkOut = futureDate(72);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const lockPayload = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
  };

  const lockResponse = await request.post(
    `${apiPrefix}/public/inventory-locks`,
    { headers: publicHeaders, data: lockPayload },
  );
  expect(lockResponse.status()).toBe(201);
  const lockBody = (await lockResponse.json()) as {
    data: { lockToken: string };
  };

  const bookingResponse = await request.post(`${apiPrefix}/public/bookings`, {
    headers: publicHeaders,
    data: {
      ...lockPayload,
      inventoryLockToken: lockBody.data.lockToken,
      guestDetails: {
        name: "Token Guest",
        email: "token-guest@e2e.rently.test",
        contactNumber: "9000000070",
      },
    },
  });
  expect(bookingResponse.status()).toBe(201);
  const bookingBody = (await bookingResponse.json()) as {
    data: { id: string; status: string; upfrontAmount: number };
  };
  expect(bookingBody.data).toMatchObject({
    status: "PENDING",
    upfrontAmount: 10,
  });

  const idempotencyKey = `e2e-token-${bookingBody.data.id}`;
  const paymentPayload = {
    checkoutToken: lockBody.data.lockToken,
    idempotencyKey,
    amount: bookingBody.data.upfrontAmount,
    purpose: "TOKEN",
  };
  const paymentUrl = `${apiPrefix}/public/bookings/${bookingBody.data.id}/payments/manual`;

  const paymentResponse = await request.post(paymentUrl, {
    headers: publicHeaders,
    data: paymentPayload,
  });
  expect(paymentResponse.status()).toBe(201);
  const paymentBody = (await paymentResponse.json()) as {
    data: {
      payment: { id: string; status: string; purpose: string; amount: number };
      booking: { status: string; paymentStatus: string; paidAmount: number };
    };
  };
  expect(paymentBody.data).toMatchObject({
    payment: {
      status: "SUCCEEDED",
      purpose: "TOKEN",
      amount: 10,
    },
    booking: {
      status: "CONFIRMED",
      paymentStatus: "PARTIALLY_PAID",
      paidAmount: 10,
    },
  });

  const replayResponse = await request.post(paymentUrl, {
    headers: publicHeaders,
    data: paymentPayload,
  });
  expect(replayResponse.status()).toBe(201);
  const replayBody = (await replayResponse.json()) as typeof paymentBody;
  expect(replayBody.data.payment.id).toBe(paymentBody.data.payment.id);

  const storedBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingBody.data.id },
    include: { payments: true, inventoryLocks: true },
  });
  expect(storedBooking.status).toBe("CONFIRMED");
  expect(storedBooking.paymentExpiresAt).toBeNull();
  expect(storedBooking.payments).toHaveLength(1);
  expect(
    storedBooking.inventoryLocks.every((lock) => lock.releasedAt !== null),
  ).toBe(true);
});
