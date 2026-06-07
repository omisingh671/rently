import { prisma } from "@/db/prisma.js";
import {
  Prisma,
  PropertyStatus,
  RoomStatus,
  UnitStatus,
  ComfortOption,
  BookingTargetType,
} from "@/generated/prisma/client.js";

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

export type PublicSpaceRecord = Prisma.RoomPricingGetPayload<{
  include: typeof publicSpaceInclude;
}>;

export interface StayPricingScope {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

export interface PublicPropertyScope {
  propertyId?: string;
  city?: string;
}

export interface PricingSelectionScope {
  guestCount: number;
  comfortOption: ComfortOption;
}

export interface PublicSpaceTarget {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}

export const activePricingBaseWhere = (
  now: Date,
  tenantId?: string,
  stay?: StayPricingScope,
  scope: PublicPropertyScope = {},
) =>
  ({
    property: {
      is: {
        isActive: true,
        status: PropertyStatus.ACTIVE,
        ...(tenantId !== undefined && { tenantId }),
        ...(scope.propertyId !== undefined && { id: scope.propertyId }),
        ...(scope.city !== undefined && { city: scope.city }),
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

export const activePricingWhere = (
  now: Date,
  tenantId?: string,
  stay?: StayPricingScope,
  scope: PublicPropertyScope = {},
) => {
  const baseWhere = activePricingBaseWhere(now, tenantId, stay, scope);

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

export const listActiveSpaces = (
  now: Date,
  minOccupancy?: number,
  tenantId?: string,
  tx?: Prisma.TransactionClient,
  stay?: StayPricingScope,
  pricing?: PricingSelectionScope,
  scope: PublicPropertyScope = {},
) =>
  client(tx).roomPricing.findMany({
    where: {
      ...activePricingWhere(now, tenantId, stay, scope),
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

export const findActiveSpaceById = (
  id: string,
  now: Date,
  tenantId?: string,
  tx?: Prisma.TransactionClient,
  stay?: StayPricingScope,
  scope: PublicPropertyScope = {},
) =>
  client(tx).roomPricing.findFirst({
    where: {
      ...activePricingWhere(now, tenantId, stay, scope),
      OR: [{ id }, { roomId: id }, { unitId: id }],
    },
    include: publicSpaceInclude,
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

export const findActivePricingForTarget = (
  target: PublicSpaceTarget,
  now: Date,
  tenantId: string | undefined,
  pricing: PricingSelectionScope,
  stay: StayPricingScope,
  tx?: Prisma.TransactionClient,
  scope: PublicPropertyScope = {},
) =>
  client(tx)
    .roomPricing.findMany({
      where: {
        ...activePricingBaseWhere(now, tenantId, stay, scope),
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

