import {
  BookingOperationEventType,
  BookingStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./bookings.repository.js";

export const assertExpectedBookingVersion = (
  actualVersion: number,
  expectedVersion: number,
) => {
  if (actualVersion !== expectedVersion) {
    throw new HttpError(
      409,
      "BOOKING_VERSION_CONFLICT",
      "Booking was changed by another operator. Reload and try again.",
    );
  }
};

export const updateVersionedBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  expectedVersion: number,
  data: Prisma.BookingUpdateManyMutationInput,
) => {
  const result = await tx.booking.updateMany({
    where: { id: bookingId, version: expectedVersion },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new HttpError(
      409,
      "BOOKING_VERSION_CONFLICT",
      "Booking was changed by another operator. Reload and try again.",
    );
  }
};

export const createOperationEvent = (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    propertyId: string;
    actorUserId: string;
    eventType: BookingOperationEventType;
    note?: string;
    metadata?: Prisma.InputJsonValue;
  },
) =>
  tx.bookingOperationEvent.create({
    data: {
      bookingId: input.bookingId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      ...(input.note !== undefined && { note: input.note }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    },
  });

export const createStatusHistory = (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    fromStatus: BookingStatus;
    toStatus: BookingStatus;
    actorUserId: string;
    note?: string;
  },
) =>
  tx.bookingStatusHistory.create({
    data: {
      bookingId: input.bookingId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      ...(input.note !== undefined && { note: input.note }),
    },
  });

export const findTransactionBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
) => {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: repo.dashboardBookingInclude,
  });
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  return booking;
};
