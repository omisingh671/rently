import { prisma } from "../../src/db/prisma.js";
import { processExpiredPendingBookings } from "../../src/modules/bookings/bookings.expiry.js";
import {
  apiPrefix,
  futureDate,
  getRoomAvailabilityOption,
  publicHeaders,
} from "../helpers.js";
import { expect, test } from "../test.js";

test("an unpaid online reservation expires and releases its inventory", async ({
  request,
}) => {
  const checkIn = futureDate(60);
  const checkOut = futureDate(62);
  const option = await getRoomAvailabilityOption(request, checkIn, checkOut);

  const bookingResponse = await request.post(`${apiPrefix}/public/bookings`, {
    headers: publicHeaders,
    data: {
      bookingOptionId: option.optionId,
      propertyId: option.propertyId,
      from: checkIn,
      to: checkOut,
      guests: 1,
      comfortOption: "NON_AC",
      guestDetails: {
        name: "Expiry Guest",
        email: "expiry-guest@e2e.rently.test",
        contactNumber: "9000000060",
      },
    },
  });
  expect(bookingResponse.status()).toBe(201);
  const bookingBody = (await bookingResponse.json()) as {
    data: { id: string; status: string; paymentExpiresAt: string | null };
  };
  expect(bookingBody.data).toMatchObject({
    status: "PENDING",
  });
  expect(bookingBody.data.paymentExpiresAt).not.toBeNull();

  await prisma.booking.update({
    where: { id: bookingBody.data.id },
    data: { paymentExpiresAt: new Date(Date.now() - 60_000) },
  });

  const processed = await processExpiredPendingBookings();
  expect(processed).toBe(1);

  const expired = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingBody.data.id },
    include: {
      inventoryLocks: true,
      roomAllocations: true,
      statusHistory: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  expect(expired.status).toBe("CANCELLED");
  expect(expired.cancelledAt).not.toBeNull();
  expect(expired.cancellationReason).toContain(
    "token payment was not completed",
  );
  expect(expired.inventoryLocks.every((lock) => lock.releasedAt !== null)).toBe(
    true,
  );
  expect(
    expired.roomAllocations.every(
      (allocation) => allocation.effectiveTo !== null,
    ),
  ).toBe(true);
  expect(expired.statusHistory[0]).toMatchObject({
    fromStatus: "PENDING",
    toStatus: "CANCELLED",
  });

  const availableAgain = await getRoomAvailabilityOption(
    request,
    checkIn,
    checkOut,
  );
  expect(availableAgain.propertyId).toBe(option.propertyId);
});
