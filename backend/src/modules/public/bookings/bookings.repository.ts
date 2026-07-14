import { prisma } from "@/db/prisma.js";
import { Prisma, BookingStatus } from "@/generated/prisma/client.js";

type PublicDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): PublicDbClient => tx ?? prisma;

export const publicBookingInclude = {
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
  payments: {
    include: {
      refunds: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  refunds: {
    orderBy: {
      createdAt: "asc",
    },
  },
  refundRequests: {
    orderBy: {
      createdAt: "desc",
    },
  },
  coupon: true,
} satisfies Prisma.BookingInclude;

export type PublicBookingRecord = Prisma.BookingGetPayload<{
  include: typeof publicBookingInclude;
}>;

export const createBooking = (
  data: Prisma.BookingCreateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.create({
    data,
    include: publicBookingInclude,
  });

export const createBookingStatusHistory = (
  data: Prisma.BookingStatusHistoryCreateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).bookingStatusHistory.create({
    data,
  });

export const findUserByEmail = (
  email: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).user.findUnique({
    where: { email },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      contactNumber: true,
    },
  });

export const createUser = (
  data: Prisma.UserCreateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).user.create({
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      contactNumber: true,
    },
  });

export const updateUserById = (
  id: string,
  data: Prisma.UserUpdateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).user.update({
    where: { id },
    data,
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      contactNumber: true,
    },
  });

export const findUserSnapshotById = (
  userId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      contactNumber: true,
    },
  });

export const countBookingsCreatedInYear = (
  start: Date,
  end: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.count({
    where: {
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });

export const runSerializableTransaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  prisma.$transaction(callback, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 10_000,
  });

export const listBookingsByUser = (userId: string) =>
  prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: publicBookingInclude,
  });

export const findBookingByUser = (
  id: string,
  userId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.findFirst({
    where: {
      id,
      userId,
    },
    include: publicBookingInclude,
  });

export const findBookingById = (id: string, tx?: Prisma.TransactionClient) =>
  client(tx).booking.findUnique({
    where: { id },
    include: publicBookingInclude,
  });

export const updateBookingById = (
  id: string,
  data: Prisma.BookingUpdateInput,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.update({
    where: { id },
    data,
    include: publicBookingInclude,
  });

export const createBookingRefundRequest = (
  data: Prisma.BookingRefundRequestCreateInput,
) =>
  prisma.bookingRefundRequest.create({
    data,
  });

export const updateRefundRequestById = (
  id: string,
  data: Prisma.BookingRefundRequestUpdateInput,
) =>
  prisma.bookingRefundRequest.update({
    where: { id },
    data,
  });

export const updateBookingCancellationById = (
  id: string,
  userId: string,
  expectedVersion: number,
  data: Prisma.BookingUpdateManyMutationInput,
  history: Prisma.BookingStatusHistoryCreateInput,
  releasedAt: Date,
) =>
  prisma.$transaction(async (tx) => {
    const result = await tx.booking.updateMany({
      where: {
        id,
        userId,
        version: expectedVersion,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    if (result.count !== 1) {
      return null;
    }

    await tx.bookingStatusHistory.create({
      data: history,
    });

    await tx.inventoryLock.updateMany({
      where: { bookingId: id, releasedAt: null },
      data: { releasedAt },
    });

    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: publicBookingInclude,
    });
  });

export const findPropertyCurrencyById = (
  propertyId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).property.findUnique({
    where: { id: propertyId },
    select: {
      tenant: {
        select: {
          defaultCurrency: true,
        },
      },
    },
  });

export const findActiveCouponByCode = (
  propertyId: string,
  code: string,
  now: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).coupon.findFirst({
    where: {
      propertyId,
      code: code.toUpperCase(),
      isActive: true,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gte: now } }],
    },
  });

export const listActiveTaxes = (
  propertyId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).tax.findMany({
    where: {
      propertyId,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

export const incrementCouponUsage = (
  id: string,
  tx: Prisma.TransactionClient,
) =>
  tx.coupon.update({
    where: { id },
    data: {
      usedCount: { increment: 1 },
    },
  });

export const decrementCouponUsage = (
  id: string,
  tx: Prisma.TransactionClient,
) =>
  tx.coupon.updateMany({
    where: {
      id,
      usedCount: { gt: 0 },
    },
    data: {
      usedCount: { decrement: 1 },
    },
  });

export const countUserCouponBookings = (
  userId: string,
  couponId: string,
  excludeBookingId?: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.count({
    where: {
      userId,
      couponId,
      ...(excludeBookingId !== undefined && {
        id: { not: excludeBookingId },
      }),
      status: {
        notIn: [BookingStatus.CANCELLED],
      },
    },
  });
