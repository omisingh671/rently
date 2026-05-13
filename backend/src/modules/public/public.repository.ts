import { prisma } from "@/db/prisma.js";
import {
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  Prisma,
  PropertyStatus,
  RoomStatus,
  UnitStatus,
} from "@/generated/prisma/client.js";
import type { PublicSpaceTarget } from "./public.inputs.js";

type PublicDbClient = typeof prisma | Prisma.TransactionClient;

const client = (tx?: Prisma.TransactionClient): PublicDbClient => tx ?? prisma;

export const publicSpaceInclude = {
  property: true,
  product: true,
  unit: true,
  room: {
    include: {
      unit: true,
    },
  },
} satisfies Prisma.RoomPricingInclude;

export const publicBookingInclude = {
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
} satisfies Prisma.BookingInclude;

const publicAvailabilityRoomInclude = {
  unit: {
    include: {
      property: true,
    },
  },
} satisfies Prisma.RoomInclude;

const publicAvailabilityUnitInclude = {
  property: true,
  rooms: true,
} satisfies Prisma.UnitInclude;

export type PublicSpaceRecord = Prisma.RoomPricingGetPayload<{
  include: typeof publicSpaceInclude;
}>;

export type PublicBookingRecord = Prisma.BookingGetPayload<{
  include: typeof publicBookingInclude;
}>;

export type PublicAvailabilityRoomRecord = Prisma.RoomGetPayload<{
  include: typeof publicAvailabilityRoomInclude;
}>;

export type PublicAvailabilityUnitRecord = Prisma.UnitGetPayload<{
  include: typeof publicAvailabilityUnitInclude;
}>;

interface StayPricingScope {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

interface PricingSelectionScope {
  guestCount: number;
  comfortOption: ComfortOption;
}

const activePricingBaseWhere = (
  now: Date,
  tenantId?: string,
  stay?: StayPricingScope,
) =>
  ({
    property: {
      is: {
        isActive: true,
        status: PropertyStatus.ACTIVE,
        ...(tenantId !== undefined && { tenantId }),
      },
    },
    product: {
      is: {},
    },
    AND: [
      {
        validFrom: { lte: stay?.checkIn ?? now },
      },
      {
        OR: [{ validTo: null }, { validTo: { gte: stay?.checkOut ?? now } }],
      },
      ...(stay !== undefined
        ? [
            { minNights: { lte: stay.nights } },
            {
              OR: [{ maxNights: null }, { maxNights: { gte: stay.nights } }],
            },
          ]
        : []),
    ],
  }) satisfies Prisma.RoomPricingWhereInput;

const activePricingWhere = (
  now: Date,
  tenantId?: string,
  stay?: StayPricingScope,
) => {
  const baseWhere = activePricingBaseWhere(now, tenantId, stay);

  return {
    ...baseWhere,
    AND: [
      ...(Array.isArray(baseWhere.AND) ? baseWhere.AND : []),
      {
        OR: [
          {
            roomId: { not: null },
            room: {
              is: {
                isActive: true,
                status: RoomStatus.AVAILABLE,
                unit: {
                  is: {
                    isActive: true,
                    status: UnitStatus.ACTIVE,
                  },
                },
              },
            },
          },
          {
            roomId: null,
            unitId: { not: null },
            unit: {
              is: {
                isActive: true,
                status: UnitStatus.ACTIVE,
              },
            },
          },
        ],
      },
    ],
  } satisfies Prisma.RoomPricingWhereInput;
};

export const findActiveTenantBySlug = (slug: string) =>
  prisma.tenant.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
  });

export const findActiveTenantById = (id: string) =>
  prisma.tenant.findFirst({
    where: {
      id,
      status: "ACTIVE",
    },
  });

export const findActiveTenantByDomain = (domain: string) =>
  prisma.tenant.findFirst({
    where: {
      primaryDomain: domain,
      status: "ACTIVE",
    },
  });

export const findDefaultTenant = () =>
  prisma.tenant.findFirst({
    where: {
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });

export const listActiveSpaces = (
  now: Date,
  minOccupancy?: number,
  tenantId?: string,
  tx?: Prisma.TransactionClient,
  stay?: StayPricingScope,
  pricing?: PricingSelectionScope,
) =>
  client(tx).roomPricing.findMany({
    where: {
      ...activePricingWhere(now, tenantId, stay),
      ...((minOccupancy !== undefined || pricing !== undefined) && {
        product: {
          is: {
            ...(minOccupancy !== undefined && {
              occupancy: { gte: minOccupancy },
            }),
            ...(pricing !== undefined && {
              occupancy: pricing.guestCount,
              hasAC: pricing.comfortOption === ComfortOption.AC,
            }),
          },
        },
      }),
    },
    include: publicSpaceInclude,
    orderBy: [{ property: { name: "asc" } }, { price: "asc" }],
  });

export const listAvailabilityRooms = (
  tenantId: string,
  comfortOption: ComfortOption,
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
  tx?: Prisma.TransactionClient,
) =>
  client(tx).unit.findMany({
    where: {
      isActive: true,
      status: UnitStatus.ACTIVE,
      property: {
        is: {
          tenantId,
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

export const findActiveSpaceById = (
  id: string,
  now: Date,
  tenantId?: string,
  tx?: Prisma.TransactionClient,
  stay?: StayPricingScope,
) =>
  client(tx).roomPricing.findFirst({
    where: {
      ...activePricingWhere(now, tenantId, stay),
      OR: [{ id }, { roomId: id }, { unitId: id }],
    },
    include: publicSpaceInclude,
  });

export const findActivePricingForTarget = (
  target: PublicSpaceTarget,
  now: Date,
  tenantId: string | undefined,
  pricing: PricingSelectionScope,
  stay: StayPricingScope,
  tx?: Prisma.TransactionClient,
) =>
  client(tx)
    .roomPricing.findMany({
      where: {
        ...activePricingBaseWhere(now, tenantId, stay),
        product: {
          is: {
            occupancy: pricing.guestCount,
            hasAC: pricing.comfortOption === ComfortOption.AC,
          },
        },
        OR:
          target.targetType === BookingTargetType.ROOM
            ? [
                { roomId: target.roomId },
                { roomId: null, unitId: target.unitId },
                { roomId: null, unitId: null },
              ]
            : [
                { roomId: null, unitId: target.unitId },
                { roomId: null, unitId: null },
              ],
      },
      include: publicSpaceInclude,
    })
    .then((pricingRows) => {
      const ranked = pricingRows.sort((left, right) => {
        const leftRank =
          left.roomId !== null ? 0 : left.unitId !== null ? 1 : 2;
        const rightRank =
          right.roomId !== null ? 0 : right.unitId !== null ? 1 : 2;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return Number(left.price) - Number(right.price);
      });

      return ranked[0] ?? null;
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
          status: { not: BookingStatus.CANCELLED },
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

export const findBookingByUser = (id: string, userId: string) =>
  prisma.booking.findFirst({
    where: {
      id,
      userId,
    },
    include: publicBookingInclude,
  });

export const updateBookingCancellationById = (
  id: string,
  data: Prisma.BookingUpdateInput,
  history: Prisma.BookingStatusHistoryCreateInput,
) =>
  prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data,
    });

    await tx.bookingStatusHistory.create({
      data: history,
    });

    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: publicBookingInclude,
    });
  });

export const findDefaultProperty = (tenantId?: string) =>
  prisma.property.findFirst({
    where: {
      ...(tenantId !== undefined && { tenantId }),
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
    orderBy: { createdAt: "asc" },
  });

export const findActivePropertyById = (id: string, tenantId?: string) =>
  prisma.property.findFirst({
    where: {
      id,
      ...(tenantId !== undefined && { tenantId }),
      isActive: true,
      status: PropertyStatus.ACTIVE,
    },
  });

export const createEnquiry = (data: Prisma.EnquiryCreateInput) =>
  prisma.enquiry.create({
    data,
  });
