import { prisma } from "@/db/prisma.js";
import {
  Prisma,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  PropertyStatus,
  RoomStatus,
  UnitStatus,
} from "@/generated/prisma/client.js";
import type {
  PublicSpaceTarget,
  PublicPropertyScope,
} from "@/modules/public/spaces/spaces.repository.js";

type PublicDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): PublicDbClient => tx ?? prisma;

const publicAvailabilityRoomInclude = {
  amenities: {
    where: {
      amenity: {
        isActive: true,
      },
    },
    include: {
      amenity: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  },
  unit: {
    include: {
      amenities: {
        where: {
          amenity: {
            isActive: true,
          },
        },
        include: {
          amenity: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      },
      property: {
        include: {
          galleries: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RoomInclude;

const publicAvailabilityUnitInclude = {
  amenities: {
    where: {
      amenity: {
        isActive: true,
      },
    },
    include: {
      amenity: {
        select: {
          id: true,
          name: true,
          icon: true,
        },
      },
    },
  },
  property: {
    include: {
      galleries: {
        orderBy: {
          createdAt: "desc",
            },
          },
        },
      },
  rooms: {
    where: {
      isActive: true,
      status: RoomStatus.AVAILABLE,
    },
    include: {
      amenities: {
        where: {
          amenity: {
            isActive: true,
          },
        },
        include: {
          amenity: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
        },
      },
    },
    orderBy: {
      number: "asc",
    },
  },
} satisfies Prisma.UnitInclude;

export type PublicAvailabilityRoomRecord = Prisma.RoomGetPayload<{
  include: typeof publicAvailabilityRoomInclude;
}>;

export type PublicAvailabilityUnitRecord = Prisma.UnitGetPayload<{
  include: typeof publicAvailabilityUnitInclude;
}>;

export const listAvailabilityRooms = (
  tenantId: string,
  comfortOption: ComfortOption,
  scope: PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
) =>
  client(tx).room.findMany({
    where: {
      isActive: true,
      status: RoomStatus.AVAILABLE,
      ...(comfortOption === ComfortOption.AC && { hasAC: true }),
      unit: {
        is: {
          isActive: true,
          status: UnitStatus.ACTIVE,
          property: {
            is: {
              tenantId,
              ...(scope.propertyId !== undefined && { id: scope.propertyId }),
              ...(scope.city !== undefined && { city: scope.city }),
              isActive: true,
              status: PropertyStatus.ACTIVE,
            },
          },
        },
      },
    },
    include: publicAvailabilityRoomInclude,
    orderBy: [
      { unit: { property: { name: "asc" } } },
      { unit: { floor: "asc" } },
      { unit: { unitNumber: "asc" } },
      { number: "asc" },
    ],
  });

export const listAvailabilityUnits = (
  tenantId: string,
  comfortOption: ComfortOption,
  scope: PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
) =>
  client(tx).unit.findMany({
    where: {
      isActive: true,
      status: UnitStatus.ACTIVE,
      property: {
        is: {
          tenantId,
          ...(scope.propertyId !== undefined && { id: scope.propertyId }),
          ...(scope.city !== undefined && { city: scope.city }),
          isActive: true,
          status: PropertyStatus.ACTIVE,
        },
      },
      rooms: {
        some: {
          isActive: true,
          status: RoomStatus.AVAILABLE,
        },
        ...(comfortOption === ComfortOption.AC && {
          every: {
            OR: [
              { isActive: false },
              { status: { not: RoomStatus.AVAILABLE } },
              { hasAC: true },
            ],
          },
        }),
      },
    },
    include: publicAvailabilityUnitInclude,
    orderBy: [
      { property: { name: "asc" } },
      { floor: "asc" },
      { unitNumber: "asc" },
    ],
  });

const targetOverlapWhere = (target: PublicSpaceTarget) =>
  target.targetType === BookingTargetType.ROOM
    ? {
        OR: [
          { targetType: BookingTargetType.ROOM, roomId: target.roomId },
          ...(target.unitId !== null
            ? [
                {
                  targetType: BookingTargetType.UNIT,
                  unitId: target.unitId,
                },
              ]
            : []),
        ],
      }
    : {
        OR: [
          { targetType: BookingTargetType.UNIT, unitId: target.unitId },
          { targetType: BookingTargetType.ROOM, unitId: target.unitId },
        ],
      };

export const hasOverlappingBooking = (
  target: PublicSpaceTarget,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).bookingItem
    .count({
      where: {
        ...targetOverlapWhere(target),
        booking: {
          status: {
            notIn: [
              BookingStatus.CANCELLED,
              BookingStatus.CHECKED_OUT,
              BookingStatus.NO_SHOW,
            ],
          },
          checkIn: { lt: checkOut },
          checkOut: { gt: checkIn },
        },
      },
    })
    .then((count) => count > 0);

export const hasOverlappingMaintenance = (
  propertyId: string,
  target: PublicSpaceTarget,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).maintenanceBlock
    .count({
      where: {
        propertyId,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
        OR: [
          { targetType: "PROPERTY" },
          ...(target.unitId !== null
            ? [
                { targetType: "UNIT" as const, unitId: target.unitId },
                {
                  targetType: "ROOM" as const,
                  room: {
                    is: {
                      unitId: target.unitId,
                    },
                  },
                },
              ]
            : []),
          ...(target.roomId !== null
            ? [{ targetType: "ROOM" as const, roomId: target.roomId }]
            : []),
        ],
      },
    })
    .then((count) => count > 0);

export const hasOverlappingInventoryLock = (
  target: PublicSpaceTarget,
  checkIn: Date,
  checkOut: Date,
  at: Date,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) =>
  client(tx).inventoryLock
    .count({
      where: {
        ...targetOverlapWhere(target),
        releasedAt: null,
        expiresAt: { gt: at },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        ...(ignoreLockToken !== undefined && {
          NOT: { lockToken: ignoreLockToken },
        }),
      },
    })
    .then((count) => count > 0);

export const createInventoryLocks = (
  data: Prisma.InventoryLockCreateManyInput[],
  tx: Prisma.TransactionClient,
) =>
  tx.inventoryLock.createMany({
    data,
  });

export const findActiveInventoryLocksByToken = (
  lockToken: string,
  at: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.findMany({
    where: {
      lockToken,
      releasedAt: null,
      expiresAt: { gt: at },
    },
    orderBy: { createdAt: "asc" },
  });

export const findReleasedInventoryLockByBookingToken = (
  bookingId: string,
  lockToken: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.findFirst({
    where: {
      bookingId,
      lockToken,
      releasedAt: { not: null },
    },
  });

export const releaseInventoryLocksByToken = (
  lockToken: string,
  releasedAt: Date,
  bookingId?: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.updateMany({
    where: {
      lockToken,
      releasedAt: null,
    },
    data: {
      releasedAt,
      ...(bookingId !== undefined && { bookingId }),
    },
  });

export const releaseInventoryLocksByBooking = (
  bookingId: string,
  releasedAt: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.updateMany({
    where: {
      bookingId,
      releasedAt: null,
    },
    data: {
      releasedAt,
    },
  });

export const cleanupExpiredInventoryLocks = (
  cutoff: Date,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).inventoryLock.deleteMany({
    where: {
      expiresAt: { lte: cutoff },
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

