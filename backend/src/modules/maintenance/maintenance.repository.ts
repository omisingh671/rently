import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { MaintenanceTargetType } from "@/generated/prisma/enums.js";

type MaintenanceDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): MaintenanceDbClient =>
  tx ?? prisma;

export const maintenanceBlockInclude = {
  property: true,
  unit: true,
  room: {
    include: {
      unit: true,
    },
  },
  createdBy: true,
  assignedTo: true,
} satisfies Prisma.MaintenanceBlockInclude;

export type MaintenanceBlockRecord = Prisma.MaintenanceBlockGetPayload<{
  include: typeof maintenanceBlockInclude;
}>;

export interface MaintenanceListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  targetType?: MaintenanceTargetType;
}

const buildMaintenanceWhere = (
  filters: Omit<MaintenanceListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      reason: { contains: filters.search },
    }),
    ...(filters.targetType !== undefined && {
      targetType: filters.targetType,
    }),
  }) satisfies Prisma.MaintenanceBlockWhereInput;

export const listMaintenancePaginated = async (
  filters: MaintenanceListFilters,
) => {
  const where = buildMaintenanceWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.maintenanceBlock.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { startDate: "desc" },
      include: maintenanceBlockInclude,
    }),
    prisma.maintenanceBlock.count({ where }),
  ]);

  return { items, total };
};

export const findMaintenanceBlockById = (id: string): Promise<MaintenanceBlockRecord | null> =>
  prisma.maintenanceBlock.findUnique({
    where: { id },
    include: maintenanceBlockInclude,
  });

export const createMaintenanceBlock = (
  data: Prisma.MaintenanceBlockCreateInput,
  tx?: Prisma.TransactionClient,
): Promise<MaintenanceBlockRecord> =>
  client(tx).maintenanceBlock.create({
    data,
    include: maintenanceBlockInclude,
  });

export const updateMaintenanceBlockById = (
  id: string,
  data: Prisma.MaintenanceBlockUpdateInput,
  tx?: Prisma.TransactionClient,
): Promise<MaintenanceBlockRecord> =>
  client(tx).maintenanceBlock.update({
    where: { id },
    data,
    include: maintenanceBlockInclude,
  });

export const deleteMaintenanceBlockById = (id: string) =>
  prisma.maintenanceBlock.delete({
    where: { id },
  });

export const hasOverlappingRoomMaintenance = (input: {
  propertyId: string;
  roomId: string;
  unitId: string;
  checkIn: Date;
  checkOut: Date;
}) =>
  prisma.maintenanceBlock
    .count({
      where: {
        propertyId: input.propertyId,
        startDate: { lt: input.checkOut },
        endDate: { gt: input.checkIn },
        OR: [
          { targetType: "PROPERTY" },
          { targetType: "UNIT", unitId: input.unitId },
          { targetType: "ROOM", roomId: input.roomId },
        ],
      },
    })
    .then((count) => count > 0);

export const listConflictingBookings = (
  input: {
    propertyId: string;
    targetType: MaintenanceTargetType;
    unitId?: string;
    roomId?: string;
    startDate: Date;
    endDate: Date;
    excludeMaintenanceId?: string;
  },
  tx?: Prisma.TransactionClient,
) =>
  client(tx).booking.findMany({
    where: {
      propertyId: input.propertyId,
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      checkIn: { lt: input.endDate },
      checkOut: { gt: input.startDate },
      items: {
        some:
          input.targetType === "PROPERTY"
            ? {}
            : input.targetType === "UNIT"
              ? { unitId: input.unitId! }
              : { roomId: input.roomId! },
      },
    },
    select: {
      id: true,
      bookingRef: true,
      guestNameSnapshot: true,
      status: true,
      checkIn: true,
      checkOut: true,
    },
    orderBy: { checkIn: "asc" },
  });

export const runMaintenanceTransaction = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Maintenance transaction retry limit reached");
};
