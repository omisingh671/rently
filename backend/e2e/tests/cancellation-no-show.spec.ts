import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  getRoomAvailabilityOption,
  loginDashboard,
  publicHeaders,
} from "../helpers.js";
import { expect, test } from "../test.js";

type DashboardBooking = {
  id: string;
  status: string;
  version: number;
  paymentStatus: string;
  paidAmount: string;
  refundedAmount: string;
  netPaidAmount: string;
  refundableAmount: string;
  balanceAmount: string;
  payments: Array<{
    id: string;
    amount: string;
    refundedAmount: string;
    refundableAmount: string;
    refunds: Array<{ id: string; amount: string; status: string }>;
  }>;
  statusHistory: Array<{ toStatus: string }>;
  roomAllocationHistory: Array<{ effectiveTo: string | null }>;
};

const localDate = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const loginFrontend = async (request: Parameters<typeof loginDashboard>[0]) => {
  const response = await request.post(`${apiPrefix}/auth/login`, {
    headers: { "x-app-client": "frontend" },
    data: e2eFixture.users.guest,
  });
  expect(response.status()).toBe(200);
  return (
    (await response.json()) as {
      data: { accessToken: string };
    }
  ).data;
};

test("a cancelled booking supports an idempotent partial manual refund", async ({
  request,
}) => {
  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const headers = bearerHeaders(manager.accessToken);
  const checkIn = futureDate(10);
  const checkOut = futureDate(11);

  const availabilityResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
    {
      headers,
      data: {
        spaceIds: [e2eFixture.pricingId],
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(availabilityResponse.status()).toBe(200);
  const availability = (await availabilityResponse.json()) as {
    data: { items: Array<{ bookingOptionId: string; available: boolean }> };
  };
  expect(availability.data.items[0]).toMatchObject({ available: true });

  const createResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers,
      data: {
        bookingOptionId: availability.data.items[0]!.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Cancellation Guest",
        guestEmail: "cancellation-guest@e2e.rently.test",
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  let booking = ((await createResponse.json()) as { data: DashboardBooking })
    .data;

  const paymentResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers,
      data: {
        amount: Number(booking.balanceAmount),
        method: "CASH",
        note: "Full cash payment received",
        idempotencyKey: `cancel-payment-${booking.id}`,
      },
    },
  );
  expect(paymentResponse.status()).toBe(201);
  booking = ((await paymentResponse.json()) as { data: DashboardBooking }).data;
  expect(booking).toMatchObject({
    paymentStatus: "PAID",
    paidAmount: "1500",
    balanceAmount: "0",
  });

  const cancelResponse = await request.patch(
    `${apiPrefix}/bookings/${booking.id}`,
    {
      headers,
      data: {
        status: "CANCELLED",
        note: "Guest cancelled before arrival; retain ₹1,000 after review",
      },
    },
  );
  expect(cancelResponse.status()).toBe(200);
  booking = ((await cancelResponse.json()) as { data: DashboardBooking }).data;
  expect(booking).toMatchObject({
    status: "CANCELLED",
    paidAmount: "1500",
    refundableAmount: "1500",
    balanceAmount: "0",
  });

  const paymentId = booking.payments[0]!.id;
  const refundPayload = {
    paymentId,
    amount: 500,
    method: "CASH",
    reason: "Approved partial cancellation refund",
    idempotencyKey: `cancel-refund-${booking.id}`,
  };
  const refundUrl = `${apiPrefix}/bookings/${booking.id}/refunds`;
  const refundResponse = await request.post(refundUrl, {
    headers,
    data: refundPayload,
  });
  expect(refundResponse.status()).toBe(201);
  booking = ((await refundResponse.json()) as { data: DashboardBooking }).data;
  expect(booking).toMatchObject({
    status: "CANCELLED",
    paidAmount: "1500",
    refundedAmount: "500",
    netPaidAmount: "1000",
    refundableAmount: "1000",
    balanceAmount: "0",
  });
  expect(booking.payments[0]).toMatchObject({
    amount: "1500",
    refundedAmount: "500",
    refundableAmount: "1000",
  });
  expect(booking.payments[0]!.refunds).toHaveLength(1);

  const replayResponse = await request.post(refundUrl, {
    headers,
    data: refundPayload,
  });
  expect(replayResponse.status()).toBe(201);
  const replay = ((await replayResponse.json()) as { data: DashboardBooking })
    .data;
  expect(replay.payments[0]!.refunds).toHaveLength(1);

  const storedRefunds = await prisma.paymentRefund.findMany({
    where: { bookingId: booking.id },
  });
  expect(storedRefunds).toHaveLength(1);
  expect(storedRefunds[0]).toMatchObject({
    status: "SUCCEEDED",
    method: "CASH",
  });
});

test("forgotten arrival blocks daily close until no-show retains its token", async ({
  request,
}) => {
  const [frontend, manager] = await Promise.all([
    loginFrontend(request),
    loginDashboard(request, e2eFixture.users.manager),
  ]);
  const frontendHeaders = {
    ...publicHeaders,
    Authorization: `Bearer ${frontend.accessToken}`,
    "x-app-client": "frontend",
  };
  const managerHeaders = bearerHeaders(manager.accessToken);
  const originalCheckIn = futureDate(20);
  const originalCheckOut = futureDate(21);
  const option = await getRoomAvailabilityOption(
    request,
    originalCheckIn,
    originalCheckOut,
  );
  const bookingInput = {
    bookingOptionId: option.optionId,
    propertyId: option.propertyId,
    from: originalCheckIn,
    to: originalCheckOut,
    guests: 1,
    comfortOption: "NON_AC",
  };

  const lockResponse = await request.post(
    `${apiPrefix}/public/inventory-locks`,
    { headers: frontendHeaders, data: bookingInput },
  );
  expect(lockResponse.status()).toBe(201);
  const lock = (await lockResponse.json()) as {
    data: { lockToken: string };
  };

  const createResponse = await request.post(`${apiPrefix}/public/bookings`, {
    headers: frontendHeaders,
    data: {
      ...bookingInput,
      inventoryLockToken: lock.data.lockToken,
      guestDetails: {
        name: "E2E Guest",
        email: e2eFixture.users.guest.email,
        contactNumber: "9000000090",
      },
    },
  });
  expect(createResponse.status()).toBe(201);
  const created = (await createResponse.json()) as {
    data: { id: string; status: string; upfrontAmount: number };
  };
  expect(created.data.status).toBe("PENDING");

  const paymentResponse = await request.post(
    `${apiPrefix}/public/bookings/${created.data.id}/payments/manual`,
    {
      headers: frontendHeaders,
      data: {
        checkoutToken: lock.data.lockToken,
        idempotencyKey: `no-show-token-${created.data.id}`,
        amount: created.data.upfrontAmount,
        purpose: "TOKEN",
      },
    },
  );
  expect(paymentResponse.status()).toBe(201);

  const today = localDate();
  const missedBusinessDate = addDays(today, -1);
  await prisma.booking.update({
    where: { id: created.data.id },
    data: {
      checkIn: new Date(`${missedBusinessDate}T00:00:00.000Z`),
      checkOut: new Date(`${today}T00:00:00.000Z`),
    },
  });

  const bookingResponse = await request.get(
    `${apiPrefix}/bookings/${created.data.id}`,
    { headers: managerHeaders },
  );
  expect(bookingResponse.status()).toBe(200);
  let booking = ((await bookingResponse.json()) as { data: DashboardBooking })
    .data;
  expect(booking).toMatchObject({
    status: "CONFIRMED",
    paidAmount: "10",
  });

  const closeUrl = `${apiPrefix}/reporting/properties/${e2eFixture.property.id}/daily-closes`;
  const blockedClose = await request.post(closeUrl, {
    headers: managerHeaders,
    data: {
      businessDate: missedBusinessDate,
      note: "Attempt close with unresolved arrival",
    },
  });
  expect(blockedClose.status()).toBe(409);
  await expect(blockedClose.json()).resolves.toMatchObject({
    error: {
      code: "UNRESOLVED_ARRIVALS",
      details: { count: 1 },
    },
  });

  const noShowResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/no-show`,
    {
      headers: managerHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Guest did not arrive and could not be contacted",
      },
    },
  );
  expect(noShowResponse.status()).toBe(200);
  booking = ((await noShowResponse.json()) as { data: DashboardBooking }).data;
  expect(booking).toMatchObject({
    status: "NO_SHOW",
    paidAmount: "10",
    refundedAmount: "0",
    netPaidAmount: "10",
    refundableAmount: "0",
    balanceAmount: "0",
  });
  expect(booking.statusHistory.map((history) => history.toStatus)).toContain(
    "NO_SHOW",
  );
  expect(
    booking.roomAllocationHistory.every(
      (allocation) => allocation.effectiveTo !== null,
    ),
  ).toBe(true);

  const refundPreview = await request.post(
    `${apiPrefix}/public/bookings/${booking.id}/refund-preview`,
    { headers: frontendHeaders, data: {} },
  );
  expect(refundPreview.status()).toBe(200);
  await expect(refundPreview.json()).resolves.toMatchObject({
    data: {
      paidAmount: 10,
      refundedAmount: 0,
      refundableAmount: 0,
      nonRefundableAmount: 10,
      tokenRefundable: false,
    },
  });

  const rejectedRefundRequest = await request.post(
    `${apiPrefix}/public/bookings/${booking.id}/refund-requests`,
    {
      headers: frontendHeaders,
      data: { reason: "Request refund for retained token" },
    },
  );
  expect(rejectedRefundRequest.status()).toBe(409);
  await expect(rejectedRefundRequest.json()).resolves.toMatchObject({
    error: { code: "BOOKING_NOT_REFUNDABLE" },
  });

  const completedClose = await request.post(closeUrl, {
    headers: managerHeaders,
    data: {
      businessDate: missedBusinessDate,
      note: "No-show resolved before close",
    },
  });
  expect(completedClose.status()).toBe(201);
  await expect(completedClose.json()).resolves.toMatchObject({
    data: { propertyId: e2eFixture.property.id },
  });
});
