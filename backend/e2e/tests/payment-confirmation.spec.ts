import { prisma } from "../../src/db/prisma.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  getRoomAvailabilityOption,
  loginDashboard,
  publicHeaders,
} from "../helpers.js";
import { e2eFixture } from "../fixtures.js";
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

test("mock gateway completes through the signed webhook inbox exactly once", async ({
  request,
}) => {
  const checkIn = futureDate(73);
  const checkOut = futureDate(75);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);
  const selection = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: checkIn,
    to: checkOut,
    guests: 1,
    comfortOption: "NON_AC",
  };
  const lockResponse = await request.post(`${apiPrefix}/public/inventory-locks`, {
    headers: publicHeaders,
    data: selection,
  });
  expect(lockResponse.status()).toBe(201);
  const lock = (await lockResponse.json()) as { data: { lockToken: string } };

  const bookingResponse = await request.post(`${apiPrefix}/public/bookings`, {
    headers: publicHeaders,
    data: {
      ...selection,
      inventoryLockToken: lock.data.lockToken,
      guestDetails: {
        name: "Gateway Guest",
        email: "gateway-guest@e2e.rently.test",
        contactNumber: "9000000073",
      },
    },
  });
  expect(bookingResponse.status()).toBe(201);
  const booking = (await bookingResponse.json()) as {
    data: { id: string; upfrontAmount: number; totalPrice: number };
  };

  const intentResponse = await request.post(
    `${apiPrefix}/public/bookings/${booking.data.id}/payments/intents`,
    {
      headers: {
        ...publicHeaders,
        "Idempotency-Key": `gateway-token-${booking.data.id}`,
      },
      data: {
        checkoutToken: lock.data.lockToken,
        amount: booking.data.totalPrice,
        purpose: "FULL_PAYMENT",
      },
    },
  );
  expect(intentResponse.status()).toBe(201);
  const intent = (await intentResponse.json()) as {
    data: {
      payment: { id: string; status: string };
      checkout: {
        mode: string;
        provider: string;
        strategy: string;
        providerOrderId: string;
      };
    };
  };
  expect(intent.data.payment.status).toBe("PENDING");
  expect(intent.data.checkout).toMatchObject({
    mode: "MOCK",
    provider: "RAZORPAY",
    strategy: "MOCK",
  });

  const completionUrl = `${apiPrefix}/public/payments/${intent.data.payment.id}/mock-complete`;
  const completionPayload = {
    checkoutToken: lock.data.lockToken,
    outcome: "SUCCEEDED",
  };
  const completion = await request.post(completionUrl, {
    headers: publicHeaders,
    data: completionPayload,
  });
  expect(completion.status()).toBe(200);
  expect((await completion.json()) as object).toMatchObject({
    data: {
      payment: { status: "SUCCEEDED", providerOrderId: intent.data.checkout.providerOrderId },
      booking: { status: "CONFIRMED", paymentStatus: "PAID" },
    },
  });

  const replay = await request.post(completionUrl, {
    headers: publicHeaders,
    data: completionPayload,
  });
  expect(replay.status()).toBe(200);

  const [storedPayment, webhookCount, receiptCount] = await Promise.all([
    prisma.payment.findUniqueOrThrow({ where: { id: intent.data.payment.id } }),
    prisma.paymentWebhookEvent.count({
      where: { provider: "RAZORPAY", status: "PROCESSED" },
    }),
    prisma.billingDocument.count({
      where: { paymentId: intent.data.payment.id, type: "RECEIPT" },
    }),
  ]);
  expect(storedPayment.status).toBe("SUCCEEDED");
  expect(webhookCount).toBeGreaterThanOrEqual(1);
  expect(receiptCount).toBe(1);

  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const dashboardHeaders = bearerHeaders(manager.accessToken);
  const cancellation = await request.patch(
    `${apiPrefix}/bookings/${booking.data.id}`,
    {
      headers: dashboardHeaders,
      data: {
        status: "CANCELLED",
        note: "Gateway refund E2E cancellation",
      },
    },
  );
  expect(cancellation.status()).toBe(200);
  const refund = await request.post(
    `${apiPrefix}/bookings/${booking.data.id}/refunds`,
    {
      headers: dashboardHeaders,
      data: {
        paymentId: intent.data.payment.id,
        amount: booking.data.totalPrice,
        method: "ONLINE_GATEWAY",
        reason: "Mock gateway refund verification",
        idempotencyKey: `gateway-refund-${booking.data.id}`,
      },
    },
  );
  expect(refund.status()).toBe(201);
  expect((await refund.json()) as object).toMatchObject({
    data: {
      paymentStatus: "REFUNDED",
      refundedAmount: String(booking.data.totalPrice),
    },
  });
  const storedRefund = await prisma.paymentRefund.findUniqueOrThrow({
    where: { idempotencyKey: `gateway-refund-${booking.data.id}` },
  });
  expect(storedRefund).toMatchObject({
    provider: "RAZORPAY",
    status: "SUCCEEDED",
    method: "ONLINE_GATEWAY",
    providerRefundStatus: "processed",
  });
});
