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

export type PublicBookingPolicyRecord =
  Prisma.PropertyBookingPolicyGetPayload<Record<string, never>>;

export type PublicTaxRecord = Prisma.TaxGetPayload<Record<string, never>>;

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

export const findBookingPolicyByPropertyId = (
  propertyId: string,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).propertyBookingPolicy.findUnique({
    where: { propertyId },
  });

export const upsertDefaultBookingPolicyByPropertyId = (
  propertyId: string,
  data: Omit<
    Prisma.PropertyBookingPolicyCreateWithoutPropertyInput,
    "id" | "createdAt" | "updatedAt"
  >,
  tx?: Prisma.TransactionClient,
) =>
  client(tx).propertyBookingPolicy.upsert({
    where: { propertyId },
    create: {
      property: { connect: { id: propertyId } },
      ...data,
    },
    update: {},
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

export const createEnquiry = (data: Prisma.EnquiryCreateInput) =>
  prisma.enquiry.create({
    data,
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
