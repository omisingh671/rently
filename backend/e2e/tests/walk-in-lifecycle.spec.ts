import { prisma } from "../../src/db/prisma.js";
import type { APIResponse } from "playwright/test";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";
import { expect, test } from "../test.js";

type BookingResponse = {
  id: string;
  status: string;
  version: number;
  totalAmount: string;
  paymentStatus: string;
  paidAmount: string;
  balanceAmount: string;
  folioTotal: string;
  payments: Array<{ id: string; status: string; amount: string }>;
  folioCharges: Array<{
    id: string;
    status: string;
    amount: string;
  }>;
  items: Array<{ roomId: string | null }>;
  roomAllocationHistory: Array<{
    roomId: string;
    effectiveTo: string | null;
  }>;
  statusHistory: Array<{ toStatus: string }>;
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

const readBooking = async (response: APIResponse) => {
  const body = (await response.json()) as { data: BookingResponse };
  return body.data;
};

test("operations can settle an explicitly overridden checkout and reverse it", async ({
  request,
}) => {
  const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
  const headers = bearerHeaders(frontDesk.accessToken);
  const checkIn = localDate();
  const checkOut = addDays(checkIn, 1);

  const availabilityResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
    {
      headers,
      data: {
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  expect(availabilityResponse.status()).toBe(200);
  const availabilityBody = (await availabilityResponse.json()) as {
    data: {
      items: Array<{
        bookingOptionId: string;
        available: boolean;
      }>;
    };
  };
  const option = availabilityBody.data.items.find((item) => item.available);
  expect(option, "Expected an available room for today's walk-in").toBeTruthy();

  const createResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers,
      data: {
        bookingOptionId: option!.bookingOptionId,
        from: checkIn,
        to: checkOut,
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Walk-in Guest",
        guestEmail: "walk-in-guest@e2e.rently.test",
        countryCode: "+91",
        contactNumber: "9000000020",
        internalNotes: "E2E walk-in lifecycle",
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  let booking = await readBooking(createResponse);
  const baseTotal = Number(booking.totalAmount);
  const partialPayment = 500;
  const folioCharge = 250;
  expect(booking).toMatchObject({
    status: "CONFIRMED",
    paymentStatus: "PENDING",
    paidAmount: "0",
    balanceAmount: String(baseTotal),
  });

  const partialPaymentResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers,
      data: {
        amount: partialPayment,
        method: "CASH",
        note: "Cash deposit received at front desk",
        idempotencyKey: `walk-in-partial-${booking.id}`,
      },
    },
  );
  expect(partialPaymentResponse.status()).toBe(201);
  booking = await readBooking(partialPaymentResponse);
  expect(booking).toMatchObject({
    status: "CONFIRMED",
    paymentStatus: "PARTIALLY_PAID",
    paidAmount: String(partialPayment),
    balanceAmount: String(baseTotal - partialPayment),
  });

  const checkInResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-in`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        identityVerified: true,
        identityDocumentType: "AADHAAR",
        identityDocumentReference: "XXXX-XXXX-0020",
        allowBalanceDueCheckIn: true,
        note: "Balance due accepted for settlement before checkout",
      },
    },
  );
  expect(checkInResponse.status()).toBe(200);
  booking = await readBooking(checkInResponse);
  expect(booking.status).toBe("CHECKED_IN");
  expect(booking.balanceAmount).toBe(String(baseTotal - partialPayment));

  const folioResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/folio-charges`,
    {
      headers,
      data: {
        expectedVersion: booking.version,
        type: "INCIDENTAL",
        description: "Airport pickup",
        amount: folioCharge,
        note: "Guest-approved transport charge",
      },
    },
  );
  expect(folioResponse.status()).toBe(201);
  booking = await readBooking(folioResponse);
  expect(booking).toMatchObject({
    folioTotal: String(folioCharge),
    balanceAmount: String(baseTotal - partialPayment + folioCharge),
  });

  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const adminHeaders = bearerHeaders(admin.accessToken);

  const checkOutResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: adminHeaders,
      data: {
        expectedVersion: booking.version,
        allowBalanceDueCheckout: true,
        note: "Guest departed before the card terminal was available",
      },
    },
  );
  expect(checkOutResponse.status()).toBe(200);
  booking = await readBooking(checkOutResponse);
  expect(booking).toMatchObject({
    status: "CHECKED_OUT",
    paymentStatus: "PARTIALLY_PAID",
    paidAmount: String(partialPayment),
    balanceAmount: String(baseTotal - partialPayment + folioCharge),
  });

  const finalPaymentResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers: adminHeaders,
      data: {
        amount: Number(booking.balanceAmount),
        method: "CARD_POS",
        referenceId: `POS-${booking.id}`,
        note: "Outstanding checked-out balance settled",
        idempotencyKey: `walk-in-final-${booking.id}`,
      },
    },
  );
  expect(finalPaymentResponse.status()).toBe(201);
  booking = await readBooking(finalPaymentResponse);
  expect(booking).toMatchObject({
    status: "CHECKED_OUT",
    paymentStatus: "PAID",
    paidAmount: String(baseTotal + folioCharge),
    balanceAmount: "0",
  });
  expect(booking.payments).toHaveLength(2);
  expect(
    booking.payments.every((payment) => payment.status === "SUCCEEDED"),
  ).toBe(true);
  expect(booking.folioCharges).toHaveLength(1);
  expect(booking.folioCharges[0]).toMatchObject({
    status: "ACTIVE",
    amount: String(folioCharge),
  });
  expect(booking.statusHistory.map((item) => item.toStatus)).toEqual(
    expect.arrayContaining(["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"]),
  );
  expect(booking.roomAllocationHistory).not.toHaveLength(0);
  expect(
    booking.roomAllocationHistory.every(
      (allocation) => allocation.effectiveTo !== null,
    ),
  ).toBe(true);

  const assignedRoomId = booking.items[0]?.roomId;
  expect(assignedRoomId).toBeTruthy();
  const [storedRoom, documents] = await Promise.all([
    prisma.room.findUniqueOrThrow({ where: { id: assignedRoomId! } }),
    prisma.billingDocument.findMany({
      where: { bookingId: booking.id },
      select: { type: true, status: true, total: true },
    }),
  ]);
  expect(storedRoom.housekeepingStatus).toBe("DIRTY");
  const invoice = documents.find((document) => document.type === "INVOICE");
  expect(invoice).toMatchObject({
    status: "ISSUED",
  });
  expect(invoice?.total.toString()).toBe(String(baseTotal + folioCharge));
  expect(
    documents.filter((document) => document.type === "RECEIPT"),
  ).toHaveLength(2);
  expect(documents.some((document) => document.type === "DEBIT_NOTE")).toBe(
    false,
  );

  const reversalResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/lifecycle-reversal`,
    {
      headers: adminHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Checkout was recorded against the wrong departure event",
      },
    },
  );
  expect(reversalResponse.status()).toBe(200);
  booking = await readBooking(reversalResponse);
  expect(booking).toMatchObject({
    status: "CHECKED_IN",
    paymentStatus: "PAID",
    balanceAmount: "0",
  });
  expect(
    booking.roomAllocationHistory.some(
      (allocation) => allocation.effectiveTo === null,
    ),
  ).toBe(true);
});
