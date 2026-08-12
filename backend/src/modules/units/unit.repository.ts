import { prisma } from "@/db/prisma.js";
import type {
  Unit,
  Prisma,
  UnitAmenity,
  UnitStatus,
} from "@/generated/prisma/client.js";

interface ListUnitsParams {
  propertyId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: UnitStatus;
  isActive?: boolean;
}

type UnitWithAmenities = Unit & { amenities: UnitAmenity[] };

export class UnitRepository {
  async create(data: Prisma.UnitCreateInput): Promise<UnitWithAmenities> {
    return prisma.unit.create({
      data,
      include: { amenities: true },
    });
  }

  async findById(id: string): Promise<UnitWithAmenities | null> {
    return prisma.unit.findUnique({
      where: { id },
      include: { amenities: true },
    });
  }

  async findByPropertyPaginated(params: ListUnitsParams): Promise<{
    items: UnitWithAmenities[];
    total: number;
  }> {
    const { propertyId, page, pageSize, search, status, isActive } = params;

    const where: Prisma.UnitWhereInput = {
      propertyId,

      ...(search && {
        unitNumber: {
          contains: search,
        },
      }),

      ...(status && { status }),

      ...(typeof isActive === "boolean" && { isActive }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.unit.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },

        include: {
          amenities: true,
        },
      }),

      prisma.unit.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.UnitUpdateInput): Promise<UnitWithAmenities> {
    return prisma.unit.update({
      where: { id },
      data,
      include: { amenities: true },
    });
  }

  async softDelete(id: string): Promise<Unit> {
    return prisma.unit.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async hasActiveInventoryCommitments(id: string, now = new Date()) {
    const roomIds = (
      await prisma.room.findMany({
        where: { unitId: id },
        select: { id: true },
      })
    ).map((room) => room.id);
    const [bookingCount, lockCount] = await Promise.all([
      prisma.booking.count({
        where: {
          status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN"] },
          checkOut: { gt: now },
          OR: [
            {
              roomAllocations: {
                some: { roomId: { in: roomIds }, effectiveTo: null },
              },
            },
            {
              roomAllocations: { none: { effectiveTo: null } },
              items: {
                some: {
                  OR: [{ unitId: id }, { roomId: { in: roomIds } }],
                },
              },
            },
          ],
        },
      }),
      prisma.inventoryLock.count({
        where: {
          releasedAt: null,
          expiresAt: { gt: now },
          OR: [{ unitId: id }, { roomId: { in: roomIds } }],
        },
      }),
    ]);

    return bookingCount > 0 || lockCount > 0;
  }

  async existsByPropertyAndUnitNumber(
    propertyId: string,
    unitNumber: string,
  ): Promise<boolean> {
    const count = await prisma.unit.count({
      where: {
        propertyId,
        unitNumber,
      },
    });

    return count > 0;
  }
}

/**
 * Count active amenities
 */
export const countActiveAmenitiesByIds = (ids: string[]) => {
  if (ids.length === 0) {
    return Promise.resolve(0);
  }

  return prisma.amenity.count({
    where: {
      id: { in: ids },
      isActive: true,
    },
  });
};

/**
 * Replace amenities transactionally
 */
export const replaceUnitAmenities = async (
  unitId: string,
  amenityIds: string[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.unitAmenity.deleteMany({
      where: { unitId },
    });

    if (amenityIds.length > 0) {
      await tx.unitAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          unitId,
          amenityId,
        })),
      });
    }

    return tx.unit.findUnique({
      where: { id: unitId },
      include: { amenities: true },
    });
  });
};
