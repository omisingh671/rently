import { HttpError } from "@/common/errors/http-error.js";
import {
  isTransientDatabaseError,
  runWithBoundedRetry,
} from "@/common/retry/retry-policy.js";
import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type {
  PropertyClosureStatus,
  PropertyClosureType,
} from "@/generated/prisma/enums.js";

export const propertyClosureInclude = {
  property: { select: { name: true } },
  createdBy: { select: { fullName: true } },
  cancelledBy: { select: { fullName: true } },
} satisfies Prisma.PropertyClosureInclude;

export type PropertyClosureRecord = Prisma.PropertyClosureGetPayload<{
  include: typeof propertyClosureInclude;
}>;

export interface PropertyClosureListFilters {
  propertyId: string;
  page: number;
  limit: number;
  search?: string;
  type?: PropertyClosureType;
  status?: PropertyClosureStatus;
}

export const listPropertyClosures = async (
  filters: PropertyClosureListFilters,
) => {
  const where = {
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      reason: { contains: filters.search },
    }),
    ...(filters.type !== undefined && { type: filters.type }),
    ...(filters.status !== undefined && { status: filters.status }),
  } satisfies Prisma.PropertyClosureWhereInput;
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.propertyClosure.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      include: propertyClosureInclude,
    }),
    prisma.propertyClosure.count({ where }),
  ]);

  return { items, total };
};

export const findPropertyClosureById = (id: string) =>
  prisma.propertyClosure.findUnique({
    where: { id },
    include: propertyClosureInclude,
  });

export const listClosureConflicts = (
  tx: Prisma.TransactionClient,
  input: {
    propertyId: string;
    startDate: Date;
    endDate: Date;
    at: Date;
  },
) =>
  Promise.all([
    tx.booking.findMany({
      where: {
        propertyId: input.propertyId,
        status: { notIn: ["CANCELLED", "CHECKED_OUT", "NO_SHOW"] },
        checkIn: { lt: input.endDate },
        checkOut: { gt: input.startDate },
      },
      select: { id: true, bookingRef: true, status: true },
      orderBy: { checkIn: "asc" },
      take: 20,
    }),
    tx.inventoryLock.count({
      where: {
        propertyId: input.propertyId,
        releasedAt: null,
        expiresAt: { gt: input.at },
        checkIn: { lt: input.endDate },
        checkOut: { gt: input.startDate },
      },
    }),
    tx.propertyClosure.count({
      where: {
        propertyId: input.propertyId,
        status: "ACTIVE",
        startDate: { lt: input.endDate },
        endDate: { gt: input.startDate },
      },
    }),
  ]);

export const createPropertyClosure = (
  tx: Prisma.TransactionClient,
  data: Prisma.PropertyClosureCreateInput,
) =>
  tx.propertyClosure.create({
    data,
    include: propertyClosureInclude,
  });

export const cancelPropertyClosure = (
  tx: Prisma.TransactionClient,
  id: string,
  input: {
    cancelledByUserId: string;
    cancelledAt: Date;
    cancellationReason: string;
  },
) =>
  tx.propertyClosure.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: input.cancelledAt,
      cancellationReason: input.cancellationReason,
      cancelledBy: { connect: { id: input.cancelledByUserId } },
    },
    include: propertyClosureInclude,
  });

export const runPropertyClosureTransaction = <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) =>
  runWithBoundedRetry({
    operation: () =>
      prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      }),
    isRetryable: isTransientDatabaseError,
    maxAttempts: 3,
    mapExhaustedError: () =>
      new HttpError(
        503,
        "PROPERTY_CLOSURE_DATABASE_UNAVAILABLE",
        "Property closure service is temporarily unavailable. Retry shortly.",
      ),
  });
