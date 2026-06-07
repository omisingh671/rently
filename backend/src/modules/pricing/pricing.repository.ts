import { prisma } from "@/db/prisma.js";
import {
  type PricingTier,
  Prisma,
  type RateType,
} from "@/generated/prisma/client.js";

export const dashboardRoomPricingInclude = {
  property: true,
  product: true,
  unit: true,
  room: {
    include: {
      unit: true,
    },
  },
} satisfies Prisma.RoomPricingInclude;

export type DashboardRoomPricingRecord = Prisma.RoomPricingGetPayload<{
  include: typeof dashboardRoomPricingInclude;
}>;

export interface RoomPricingListFilters {
  page: number;
  limit: number;
  propertyId: string;
  productId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
}

const buildRoomPricingWhere = (
  filters: Omit<RoomPricingListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.productId !== undefined && { productId: filters.productId }),
    ...(filters.rateType !== undefined && { rateType: filters.rateType }),
    ...(filters.pricingTier !== undefined && {
      pricingTier: filters.pricingTier,
    }),
  }) satisfies Prisma.RoomPricingWhereInput;

export const listRoomPricingPaginated = async (
  filters: RoomPricingListFilters,
) => {
  const where = buildRoomPricingWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.roomPricing.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { validFrom: "desc" },
      include: dashboardRoomPricingInclude,
    }),
    prisma.roomPricing.count({ where }),
  ]);

  return { items, total };
};

export const findRoomPricingById = (id: string) =>
  prisma.roomPricing.findUnique({
    where: { id },
    include: dashboardRoomPricingInclude,
  });

export const findOverlappingRoomPricing = (input: {
  propertyId: string;
  productId: string;
  roomId?: string | null;
  unitId?: string | null;
  rateType: RateType;
  validFrom: Date;
  validTo?: Date | null;
  excludePricingId?: string;
}) => {
  const scopeWhere =
    input.roomId !== undefined && input.roomId !== null
      ? { roomId: input.roomId }
      : input.unitId !== undefined && input.unitId !== null
        ? { roomId: null, unitId: input.unitId }
        : { roomId: null, unitId: null };

  return prisma.roomPricing.findFirst({
    where: {
      propertyId: input.propertyId,
      productId: input.productId,
      rateType: input.rateType,
      ...scopeWhere,
      ...(input.excludePricingId !== undefined && {
        id: { not: input.excludePricingId },
      }),
      validFrom: { lte: input.validTo ?? new Date("9999-12-31T00:00:00.000Z") },
      OR: [{ validTo: null }, { validTo: { gte: input.validFrom } }],
    },
    include: dashboardRoomPricingInclude,
  });
};

export const createRoomPricing = (data: Prisma.RoomPricingCreateInput) =>
  prisma.roomPricing.create({
    data,
    include: dashboardRoomPricingInclude,
  });

export const updateRoomPricingById = (
  id: string,
  data: Prisma.RoomPricingUpdateInput,
) =>
  prisma.roomPricing.update({
    where: { id },
    data,
    include: dashboardRoomPricingInclude,
  });

export const deleteRoomPricingById = (id: string) =>
  prisma.roomPricing.delete({
    where: { id },
  });

export const countRoomPricing = (propertyIds?: string[]) =>
  prisma.roomPricing.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const findPropertyById = (id: string) =>
  prisma.property.findUnique({
    where: { id },
  });

export const findUnitById = (id: string) =>
  prisma.unit.findUnique({
    where: { id },
  });

export const findRoomById = (id: string) =>
  prisma.room.findUnique({
    where: { id },
    include: {
      unit: true,
    },
  });

export const findRoomProductById = (id: string) =>
  prisma.roomProduct.findUnique({
    where: { id },
  });
