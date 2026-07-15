import { Prisma } from "@/generated/prisma/client.js";
import { isTransientDatabaseError, runWithBoundedRetry } from "@/common/retry/retry-policy.js";
import * as repo from "./bookings.repository.js";

const maxBookingTransactionAttempts = 3;

interface BookingTransactionRetryOptions {
  mapExhaustedError?: (error: unknown) => Error;
}

export const getNights = (checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, nights);
};

export const runBookingTransactionWithRetry = async <Result>(
  operation: () => Promise<Result>,
  options: BookingTransactionRetryOptions = {},
): Promise<Result> => {
  return runWithBoundedRetry({
    operation,
    isRetryable: isTransientDatabaseError,
    maxAttempts: maxBookingTransactionAttempts,
    ...(options.mapExhaustedError !== undefined && {
      mapExhaustedError: options.mapExhaustedError,
    }),
  });
};

const getBookingYearRange = (date: Date) => {
  const year = date.getUTCFullYear();
  return {
    year,
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  };
};

export const generateBookingRef = async (
  createdAt: Date,
  tx: Prisma.TransactionClient,
) => {
  const { year, start, end } = getBookingYearRange(createdAt);
  const count = await repo.countBookingsCreatedInYear(start, end, tx);
  return `SCH-${year}-${String(count + 1).padStart(6, "0")}`;
};

export const releaseBookingLock = async (
  lockToken: string | undefined,
  bookingId: string,
  tx: Prisma.TransactionClient,
) => {
  if (lockToken === undefined) {
    return;
  }

  await tx.inventoryLock.updateMany({
    where: {
      lockToken,
      releasedAt: null,
    },
    data: {
      releasedAt: new Date(),
      bookingId,
    },
  });
};
