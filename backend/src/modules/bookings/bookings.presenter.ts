import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  getBookingAssignmentLabels,
} from "./bookings.assignment.js";
import {
  syncFulfilledRefundRequest,
} from "./bookings.financials.js";
import { mapBooking } from "./bookings.mapper.js";
import * as repo from "./bookings.repository.js";

export const mapDashboardBookings = async (
  bookings: repo.DashboardBookingRecord[],
) => {
  const syncedBookings = await Promise.all(
    bookings.map(syncFulfilledRefundRequest),
  );
  const assignmentLabels = await getBookingAssignmentLabels(bookings);
  return syncedBookings.map((booking) => mapBooking(booking, assignmentLabels));
};

export const mapDashboardBooking = async (
  booking: repo.DashboardBookingRecord,
) => {
  const syncedBooking = await syncFulfilledRefundRequest(booking);
  const mapped = await mapDashboardBookings([syncedBooking]);
  const firstBooking = mapped[0];

  if (!firstBooking) {
    throw new HttpError(
      500,
      "BOOKING_MAP_FAILED",
      "Booking could not be mapped",
    );
  }

  return firstBooking;
};

export const mapTransactionBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
) =>
  mapDashboardBooking(
    await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: repo.dashboardBookingInclude,
    }),
  );
