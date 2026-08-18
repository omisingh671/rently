import type { APIResponse } from "playwright/test";
import { prisma } from "../../src/db/prisma.js";
import { e2eFixture } from "../fixtures.js";
import { apiPrefix, bearerHeaders, loginDashboard } from "../helpers.js";
import { createBackdatedCheckedInBooking } from "../test-data/backdated-booking.js";
import { expect, test } from "../test.js";

type BookingResponse = {
  id: string;
  status: string;
  version: number;
  totalAmount: string;
  folioTotal: string;
  netPaidAmount: string;
  balanceAmount: string;
  paymentStatus: string;
  folioCharges: Array<{
    id: string;
    type: string;
    status: "ACTIVE" | "VOID";
    description: string;
    amount: string;
  }>;
  roomAllocationHistory: Array<{ effectiveTo: string | null }>;
};

const readBooking = async (response: APIResponse) => {
  const body = (await response.json()) as { data: BookingResponse };
  return body.data;
};

const getBooking = async (
  request: Parameters<typeof loginDashboard>[0],
  bookingId: string,
  headers: ReturnType<typeof bearerHeaders>,
) => {
  const response = await request.get(`${apiPrefix}/bookings/${bookingId}`, {
    headers,
  });
  expect(response.status()).toBe(200);
  return readBooking(response);
};

const expectReconciled = (booking: BookingResponse) => {
  expect(
    Number(booking.totalAmount) +
      Number(booking.folioTotal) -
      Number(booking.netPaidAmount),
  ).toBe(Number(booking.balanceAmount));
};

const createdBookingIds: string[] = [];

test.afterEach(async () => {
  if (createdBookingIds.length > 0) {
    await prisma.booking.deleteMany({
      where: { id: { in: createdBookingIds.splice(0) } },
    });
  }
  await prisma.room.updateMany({
    where: {
      id: {
        in: [e2eFixture.roomId, e2eFixture.upgradeRoomId],
      },
    },
    data: { housekeepingStatus: "INSPECTED" },
  });
});

test("late checkout requires an explicit Admin override, supports post-checkout settlement, and can then be reversed", async ({
  request,
}) => {
  const fixture = await createBackdatedCheckedInBooking({
    roomId: e2eFixture.roomId,
    scenario: "override and settlement",
  });
  createdBookingIds.push(fixture.id);
  const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
  const frontDeskHeaders = bearerHeaders(frontDesk.accessToken);
  let booking = await getBooking(request, fixture.id, frontDeskHeaders);

  const blockedCheckout = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: frontDeskHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Late departure identified at the desk",
      },
    },
  );
  expect(blockedCheckout.status()).toBe(409);
  await expect(blockedCheckout.json()).resolves.toMatchObject({
    error: { code: "CHECK_OUT_BALANCE_DUE" },
  });

  booking = await getBooking(request, fixture.id, frontDeskHeaders);
  const lateCharge = booking.folioCharges.find(
    (charge) =>
      charge.status === "ACTIVE" &&
      charge.type === "EXTENSION" &&
      charge.description.startsWith("Late checkout extension:"),
  );
  expect(lateCharge).toBeTruthy();
  expect(Number(lateCharge!.amount)).toBeGreaterThan(0);
  expect(booking.balanceAmount).toBe(lateCharge!.amount);
  expectReconciled(booking);

  const forbiddenFrontDeskOverride = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: frontDeskHeaders,
      data: {
        expectedVersion: booking.version,
        allowBalanceDueCheckout: true,
        note: "Front Desk must not be able to authorize a balance override",
      },
    },
  );
  expect(forbiddenFrontDeskOverride.status()).toBe(409);
  await expect(forbiddenFrontDeskOverride.json()).resolves.toMatchObject({
    error: { code: "CHECK_OUT_BALANCE_DUE" },
  });

  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const adminHeaders = bearerHeaders(admin.accessToken);
  const overriddenCheckout = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: adminHeaders,
      data: {
        expectedVersion: booking.version,
        allowBalanceDueCheckout: true,
        note: "Guest departed; approved receivable will be settled immediately",
      },
    },
  );
  expect(overriddenCheckout.status()).toBe(200);
  booking = await readBooking(overriddenCheckout);
  expect(booking).toMatchObject({
    status: "CHECKED_OUT",
    balanceAmount: lateCharge!.amount,
  });
  expectReconciled(booking);

  const settled = await request.post(
    `${apiPrefix}/bookings/${booking.id}/payments`,
    {
      headers: adminHeaders,
      data: {
        amount: Number(booking.balanceAmount),
        method: "CARD_POS",
        referenceId: `E2E-LATE-${booking.id}`,
        note: "Late checkout balance collected after departure",
        idempotencyKey: `e2e-late-settlement-${booking.id}`,
      },
    },
  );
  expect(settled.status()).toBe(201);
  booking = await readBooking(settled);
  expect(booking).toMatchObject({
    status: "CHECKED_OUT",
    paymentStatus: "PAID",
    balanceAmount: "0",
  });
  expectReconciled(booking);

  const reversed = await request.post(
    `${apiPrefix}/bookings/${booking.id}/lifecycle-reversal`,
    {
      headers: adminHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Departure was entered against the wrong operational event",
      },
    },
  );
  expect(reversed.status()).toBe(200);
  booking = await readBooking(reversed);
  expect(booking.status).toBe("CHECKED_IN");
  expect(booking.balanceAmount).toBe("0");
  expect(
    booking.roomAllocationHistory.some(
      (allocation) => allocation.effectiveTo === null,
    ),
  ).toBe(true);
});

test("an audited void waives the generated late-checkout charge without recreating it", async ({
  request,
}) => {
  const fixture = await createBackdatedCheckedInBooking({
    roomId: e2eFixture.upgradeRoomId,
    scenario: "charge waiver",
  });
  createdBookingIds.push(fixture.id);
  const frontDesk = await loginDashboard(request, e2eFixture.users.frontDesk);
  const frontDeskHeaders = bearerHeaders(frontDesk.accessToken);
  let booking = await getBooking(request, fixture.id, frontDeskHeaders);

  const initialCheckout = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: frontDeskHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Late departure requires fee review",
      },
    },
  );
  expect(initialCheckout.status()).toBe(409);
  booking = await getBooking(request, booking.id, frontDeskHeaders);
  const generatedCharge = booking.folioCharges.find(
    (charge) =>
      charge.status === "ACTIVE" &&
      charge.type === "EXTENSION" &&
      charge.description.startsWith("Late checkout extension:"),
  );
  expect(generatedCharge).toBeTruthy();

  const admin = await loginDashboard(request, e2eFixture.users.admin);
  const adminHeaders = bearerHeaders(admin.accessToken);
  const waived = await request.post(
    `${apiPrefix}/bookings/${booking.id}/folio-charges/${generatedCharge!.id}/void`,
    {
      headers: adminHeaders,
      data: {
        expectedVersion: booking.version,
        reason: "Manager-approved service recovery for a documented delay",
      },
    },
  );
  expect(waived.status()).toBe(200);
  booking = await readBooking(waived);
  expect(booking.folioTotal).toBe("0");
  expect(booking.balanceAmount).toBe("0");
  expect(
    booking.folioCharges.find(
      (charge) => charge.id === generatedCharge!.id,
    )?.status,
  ).toBe("VOID");
  expectReconciled(booking);

  const completedCheckout = await request.post(
    `${apiPrefix}/bookings/${booking.id}/check-out`,
    {
      headers: frontDeskHeaders,
      data: {
        expectedVersion: booking.version,
        note: "Approved late checkout waiver verified in the folio",
      },
    },
  );
  expect(completedCheckout.status()).toBe(200);
  booking = await readBooking(completedCheckout);
  expect(booking.status).toBe("CHECKED_OUT");
  expect(booking.balanceAmount).toBe("0");
  expect(
    booking.folioCharges.filter(
      (charge) =>
        charge.type === "EXTENSION" &&
        charge.description.startsWith("Late checkout extension:"),
    ),
  ).toHaveLength(1);
  expect(booking.folioCharges[0]?.status).toBe("VOID");
});
