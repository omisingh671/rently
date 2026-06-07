import { prisma } from "@/db/prisma.js";
import type { Prisma } from "@/generated/prisma/client.js";
import type { RoomProductCategory } from "@/generated/prisma/enums.js";

export const roomProductInclude = {
  property: true,
} satisfies Prisma.RoomProductInclude;

export type RoomProductRecord = Prisma.RoomProductGetPayload<{
  include: typeof roomProductInclude;
}>;

export interface RoomProductListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  category?: RoomProductCategory;
}

const buildRoomProductWhere = (
  filters: Omit<RoomProductListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.search !== undefined && {
      name: { contains: filters.search },
    }),
    ...(filters.category !== undefined && { category: filters.category }),
  }) satisfies Prisma.RoomProductWhereInput;

export const listRoomProductsPaginated = async (
  filters: RoomProductListFilters,
) => {
  const where = buildRoomProductWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.roomProduct.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: roomProductInclude,
    }),
    prisma.roomProduct.count({ where }),
  ]);

  return { items, total };
};

export const findRoomProductById = (id: string): Promise<RoomProductRecord | null> =>
  prisma.roomProduct.findUnique({
    where: { id },
    include: roomProductInclude,
  });

export const createRoomProduct = (data: Prisma.RoomProductCreateInput): Promise<RoomProductRecord> =>
  prisma.roomProduct.create({
    data,
    include: roomProductInclude,
  });

export const updateRoomProductById = (
  id: string,
  data: Prisma.RoomProductUpdateInput,
): Promise<RoomProductRecord> =>
  prisma.roomProduct.update({
    where: { id },
    data,
    include: roomProductInclude,
  });
