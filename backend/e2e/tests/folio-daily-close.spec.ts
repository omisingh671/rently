import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  loginDashboard,
} from "../helpers.js";
import { expect, test } from "../test.js";

type DashboardBooking = {
  id: string;
  status: string;
  version: number;
  totalAmount: string;
  paymentStatus: string;
  paidAmount: string;
  refundedAmount: string;
  balanceAmount: string;
  folioTotal: string;
  payments: Array<{
    id: string;
    amount: string;
    refunds: Array<{ id: string; amount: string; status: string }>;
  }>;
  folioCharges: Array<{
    id: string;
    status: string;
    amount: string;
    voidReason: string | null;
  }>;
  operationEvents: Array<{ eventType: string }>;
};

type DailyClose = {
  id: string;
  propertyId: string;
  businessDate: string;
  paymentCount: number;
  paymentTotal: number;
  refundCount: number;
  refundTotal: number;
  netPaymentTotal: number;
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

const createWalkIn = async (
  request: Parameters<typeof loginDashboard>[0],
  headers: ReturnType<typeof bearerHeaders>,
  checkIn: string,
  checkOut: string,
  guestLabel: string,
) => {
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
        guestName: guestLabel,
        guestEmail: `${guestLabel.toLowerCase().replaceAll(" ", "-")}@e2e.rently.test`,
      },
    },
  );
  expect(createResponse.status()).toBe(201);
  return ((await createResponse.json()) as { data: DashboardBooking }).data;
};

test("a post-invoice folio charge issues a debit note and void issues its credit note", async ({
  request,
}) => {
  const [manager, accountant] = await Promise.all([
    loginDashboard(request, e2eFixture.users.manager),
    loginDashboard(request, e2eFixture.users.accountant),
  ]);
  const managerHeaders = bearerHeaders(manager.accessToken);
  const accountantHeaders = bearerHeaders(accountant.accessToken);
  let booking = await createWalkIn(
    request,
    managerHeaders,
    futureDate(14),
    futureDate(15),
    "Folio Document Guest",
  );

  const paymentResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers: managerHeaders,
      data: {
        amount: Number(booking.balanceAmount),
        method: "CASH",
        note: "Booking settled before incidental charge",
        idempotencyKey: `folio-settlement-${booking.id}`,
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

  const chargeResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/folio-charges`,
    {
      headers: managerHeaders,
      data: {
        expectedVersion: booking.version,
        type: "INCIDENTAL",
        description: "Replacement access card",
        amount: 250,
        note: "Guest acknowledged the replacement charge",
      },
    },
  );
  expect(chargeResponse.status()).toBe(201);
  booking = ((await chargeResponse.json()) as { data: DashboardBooking }).data;
  const charge = booking.folioCharges.find(
    (item) => item.status === "ACTIVE" && item.amount === "250",
  );
  expect(charge).toBeTruthy();
  expect(booking).toMatchObject({ folioTotal: "250", balanceAmount: "250" });

  const voidResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/folio-charges/${charge!.id}/void`,
    {
      headers: accountantHeaders,
      data: {
        expectedVersion: booking.version,
        reason: "Charge posted to the wrong guest folio",
      },
    },
  );
  expect(voidResponse.status()).toBe(200);
  booking = ((await voidResponse.json()) as { data: DashboardBooking }).data;
  expect(booking).toMatchObject({ folioTotal: "0", balanceAmount: "0" });
  expect(booking.folioCharges).toContainEqual(
    expect.objectContaining({
      id: charge!.id,
      status: "VOID",
      amount: "250",
      voidReason: "Charge posted to the wrong guest folio",
    }),
  );
  expect(booking.operationEvents.map((event) => event.eventType)).toEqual(
    expect.arrayContaining(["FOLIO_CHARGE", "FOLIO_CHARGE_VOID"]),
  );

  const documents = await prisma.billingDocument.findMany({
    where: { bookingId: booking.id },
    select: {
      id: true,
      type: true,
      status: true,
      total: true,
      folioChargeId: true,
      priceSnapshot: true,
    },
  });
  const invoice = documents.find((document) => document.type === "INVOICE");
  const receipt = documents.find((document) => document.type === "RECEIPT");
  const debitNote = documents.find(
    (document) => document.type === "DEBIT_NOTE",
  );
  const creditNote = documents.find(
    (document) => document.type === "CREDIT_NOTE",
  );
  expect(invoice).toMatchObject({ status: "ISSUED" });
  expect(invoice?.total.toString()).toBe("1500");
  expect(receipt).toMatchObject({ status: "ISSUED" });
  expect(debitNote).toMatchObject({
    status: "ISSUED",
    folioChargeId: charge!.id,
  });
  expect(debitNote?.total.toString()).toBe("250");
  expect(creditNote).toMatchObject({
    status: "ISSUED",
    folioChargeId: charge!.id,
  });
  expect(creditNote?.total.toString()).toBe("250");
  expect(creditNote?.priceSnapshot).toMatchObject({
    reversedDocumentId: debitNote!.id,
    reason: "Charge posted to the wrong guest folio",
  });
});

test("daily close reconciles split payments, refund, and net collection once", async ({
  request,
}) => {
  const manager = await loginDashboard(request, e2eFixture.users.manager);
  const headers = bearerHeaders(manager.accessToken);
  let booking = await createWalkIn(
    request,
    headers,
    futureDate(16),
    futureDate(17),
    "Daily Close Guest",
  );

  for (const [amount, method] of [
    [500, "CASH"],
    [1000, "CARD_POS"],
  ] as const) {
    const paymentResponse = await request.post(
      `${apiPrefix}/bookings/${booking.id}/payments`,
      {
        headers,
        data: {
          amount,
          method,
          ...(method === "CARD_POS" && {
            referenceId: `DAILY-CLOSE-POS-${booking.id}`,
          }),
          note: `${method} payment for reconciliation fixture`,
          idempotencyKey: `daily-close-${method}-${booking.id}`,
        },
      },
    );
    expect(paymentResponse.status()).toBe(201);
    booking = ((await paymentResponse.json()) as { data: DashboardBooking })
      .data;
  }
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
        note: "Cancelled to exercise an approved partial refund",
      },
    },
  );
  expect(cancelResponse.status()).toBe(200);
  booking = ((await cancelResponse.json()) as { data: DashboardBooking }).data;
  const cashPayment = booking.payments.find(
    (payment) => payment.amount === "500",
  );
  expect(cashPayment).toBeTruthy();

  const refundResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/refunds`,
    {
      headers,
      data: {
        paymentId: cashPayment!.id,
        amount: 300,
        method: "CASH",
        reason: "Approved partial refund for close reconciliation",
        idempotencyKey: `daily-close-refund-${booking.id}`,
      },
    },
  );
  expect(refundResponse.status()).toBe(201);
  booking = ((await refundResponse.json()) as { data: DashboardBooking }).data;
  const refund = booking.payments
    .flatMap((payment) => payment.refunds)
    .find((item) => item.amount === "300");
  expect(refund).toMatchObject({ status: "SUCCEEDED" });

  const businessDate = addDays(localDate(), -2);
  await Promise.all([
    prisma.payment.update({
      where: { id: booking.payments[0]!.id },
      data: { paidAt: new Date(`${businessDate}T06:00:00.000Z`) },
    }),
    prisma.payment.update({
      where: { id: booking.payments[1]!.id },
      data: { paidAt: new Date(`${businessDate}T07:00:00.000Z`) },
    }),
    prisma.paymentRefund.update({
      where: { id: refund!.id },
      data: { processedAt: new Date(`${businessDate}T08:00:00.000Z`) },
    }),
  ]);

  const closeUrl = `${apiPrefix}/reporting/properties/${e2eFixture.property.id}/daily-closes`;
  const closePayload = {
    businessDate,
    note: "Known E2E reconciliation fixture",
  };
  const closeResponse = await request.post(closeUrl, {
    headers,
    data: closePayload,
  });
  expect(closeResponse.status()).toBe(201);
  const close = ((await closeResponse.json()) as { data: DailyClose }).data;
  expect(close).toMatchObject({
    propertyId: e2eFixture.property.id,
    businessDate,
    paymentCount: 2,
    paymentTotal: 1500,
    refundCount: 1,
    refundTotal: 300,
    netPaymentTotal: 1200,
  });

  const replayResponse = await request.post(closeUrl, {
    headers,
    data: closePayload,
  });
  expect(replayResponse.status()).toBe(201);
  const replay = ((await replayResponse.json()) as { data: DailyClose }).data;
  expect(replay).toEqual(close);

  const storedCloses = await prisma.propertyDailyClose.findMany({
    where: {
      propertyId: e2eFixture.property.id,
      businessDate: new Date(`${businessDate}T00:00:00.000Z`),
    },
  });
  expect(storedCloses).toHaveLength(1);
  expect(storedCloses[0]!.paymentTotal.toString()).toBe("1500");
  expect(storedCloses[0]!.refundTotal.toString()).toBe("300");
  expect(storedCloses[0]!.netPaymentTotal.toString()).toBe("1200");
});
