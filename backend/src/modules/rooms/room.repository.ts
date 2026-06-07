import { prisma } from "@/db/prisma.js";
import type { Prisma } from "@/generated/prisma/client.js";
import type { RoomStatus } from "@/generated/prisma/enums.js";

// Include shapes
export const roomInclude = {
  unit: {
    include: {
      property: true,
    },
  },
  amenities: true,
} satisfies Prisma.RoomInclude;

// Record Types
export type RoomRecord = Prisma.RoomGetPayload<{
  include: typeof roomInclude;
}>;

// Filter interfaces
export interface RoomListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: RoomStatus;
  isActive?: boolean;
}

// Where Clause Builders
const buildRoomWhere = (filters: Omit<RoomListFilters, "page" | "limit">) =>
  ({
    unit: {
      is: {
        propertyId: filters.propertyId,
      },
    },
    ...(filters.search !== undefined && {
      OR: [
        { name: { contains: filters.search } },
        { number: { contains: filters.search } },
        {
          unit: {
            is: {
              unitNumber: { contains: filters.search },
            },
          },
        },
      ],
    }),
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  }) satisfies Prisma.RoomWhereInput;

// Room Repository API
export const listRoomsPaginated = async (filters: RoomListFilters) => {
  const where = buildRoomWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.room.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: roomInclude,
    }),
    prisma.room.count({ where }),
  ]);

  return { items, total };
};

export const findRoomById = (id: string): Promise<RoomRecord | null> =>
  prisma.room.findUnique({
    where: { id },
    include: roomInclude,
  });

export const findRoomByUnitAndNumber = (unitId: string, number: string): Promise<RoomRecord | null> =>
  prisma.room.findUnique({
    where: {
      unitId_number: {
        unitId,
        number,
      },
    },
    include: roomInclude,
  });

export const createRoom = (data: Prisma.RoomCreateInput): Promise<RoomRecord> =>
  prisma.room.create({
    data,
    include: roomInclude,
  });

export const updateRoomById = (id: string, data: Prisma.RoomUpdateInput): Promise<RoomRecord> =>
  prisma.room.update({
    where: { id },
    data,
    include: roomInclude,
  });

export const softDeleteRoomById = (id: string): Promise<RoomRecord> =>
  prisma.room.update({
    where: { id },
    data: { isActive: false },
    include: roomInclude,
  });

export const replaceRoomAmenities = async (roomId: string, amenityIds: string[]): Promise<RoomRecord | null> =>
  prisma.$transaction(async (tx) => {
    await tx.roomAmenity.deleteMany({
      where: { roomId },
    });

    if (amenityIds.length > 0) {
      await tx.roomAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          roomId,
          amenityId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.room.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });
  });
