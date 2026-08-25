import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import {
  apiPrefix,
  bearerHeaders,
  futureDate,
  loginDashboard,
} from "../helpers.js";
import { expect, test } from "../test.js";

test("payment and invoice post once, balance, and reverse through the scoped journal", async ({
  request,
}) => {
  const [manager, accountant] = await Promise.all([
    loginDashboard(request, e2eFixture.users.manager),
    loginDashboard(request, e2eFixture.users.accountant),
  ]);
  const managerHeaders = bearerHeaders(manager.accessToken);
  const accountantHeaders = bearerHeaders(accountant.accessToken);

  const availabilityResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings/availability`,
    {
      headers: managerHeaders,
      data: {
        spaceIds: [e2eFixture.pricingId],
        from: futureDate(61),
        to: futureDate(62),
        guests: 1,
        comfortOption: "NON_AC",
      },
    },
  );
  const option = (
    (await availabilityResponse.json()) as {
      data: { items: Array<{ bookingOptionId: string }> };
    }
  ).data.items[0]!;
  const bookingResponse = await request.post(
    `${apiPrefix}/properties/${e2eFixture.property.id}/bookings`,
    {
      headers: managerHeaders,
      data: {
        bookingOptionId: option.bookingOptionId,
        from: futureDate(61),
        to: futureDate(62),
        guests: 1,
        comfortOption: "NON_AC",
        guestName: "Accounting Ledger Guest",
        guestEmail: "accounting-ledger-guest@e2e.rently.test",
      },
    },
  );
  const booking = (
    (await bookingResponse.json()) as {
      data: { id: string; balanceAmount: string };
    }
  ).data;
  const paymentData = {
    amount: Number(booking.balanceAmount),
    method: "CASH",
    note: "Accounting ledger E2E",
    idempotencyKey: `accounting-payment-${booking.id}`,
  };
  const paymentResponse = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers: managerHeaders,
      data: paymentData,
    },
  );
  expect(paymentResponse.status()).toBe(201);
  const replay = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers: managerHeaders,
      data: paymentData,
    },
  );
  expect(replay.status()).toBe(201);

  const entriesBeforeVoid = await prisma.journalEntry.findMany({
    where: { lines: { some: { bookingId: booking.id } } },
    include: { lines: true },
  });
  expect(entriesBeforeVoid).toHaveLength(3);
  for (const entry of entriesBeforeVoid) {
    expect(entry.totalDebit.equals(entry.totalCredit)).toBe(true);
    expect(entry.totalDebit.greaterThan(0)).toBe(true);
  }

  const invoice = await prisma.billingDocument.findFirstOrThrow({
    where: { bookingId: booking.id, type: "INVOICE" },
  });
  const voidResponse = await request.patch(
    `${apiPrefix}/billing-documents/${invoice.id}/void`,
    {
      headers: accountantHeaders,
      data: { reason: "E2E reversal verification" },
    },
  );
  expect(voidResponse.status()).toBe(200);
  const voidReplay = await request.patch(
    `${apiPrefix}/billing-documents/${invoice.id}/void`,
    {
      headers: accountantHeaders,
      data: { reason: "E2E reversal verification" },
    },
  );
  expect(voidReplay.status()).toBe(200);

  const reversals = await prisma.journalEntry.findMany({
    where: { sourceType: "BILLING_DOCUMENT_VOID", sourceId: invoice.id },
  });
  expect(reversals).toHaveLength(2);
  expect(new Set(reversals.map((entry) => entry.reversalOfEntryId)).size).toBe(
    2,
  );

  const startDate = new Date().toISOString().slice(0, 10);
  const journalResponse = await request.get(
    `${apiPrefix}/accounting/journal?propertyId=${e2eFixture.property.id}&startDate=${startDate}&endDate=${startDate}`,
    { headers: accountantHeaders },
  );
  expect(journalResponse.status()).toBe(200);
  const journal = (await journalResponse.json()) as {
    data: { items: Array<{ totalDebit: string; totalCredit: string }> };
  };
  expect(journal.data.items.length).toBeGreaterThanOrEqual(5);
  expect(
    journal.data.items.every((entry) => entry.totalDebit === entry.totalCredit),
  ).toBe(true);

  const reconciliationResponse = await request.get(
    `${apiPrefix}/accounting/reconciliation?propertyId=${e2eFixture.property.id}&startDate=${startDate}&endDate=${startDate}`,
    { headers: accountantHeaders },
  );
  expect(reconciliationResponse.status()).toBe(200);
  const reconciliation = (await reconciliationResponse.json()) as {
    data: {
      unbalancedEntries: number;
      missing: { payments: number; billingDocuments: number };
    };
  };
  expect(reconciliation.data.unbalancedEntries).toBe(0);
  expect(reconciliation.data.missing).toMatchObject({
    payments: 0,
    billingDocuments: 0,
  });
});
