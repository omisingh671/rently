import { prisma } from "@/db/prisma.js";
import type { PropertyStatus } from "@/generated/prisma/enums.js";

/* ----------------------------------
   Types
----------------------------------- */

export type RepoListFilters = {
  page: number;
  limit: number;
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
};

type WhereFilters = {
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
};

/* ----------------------------------
   Helpers
----------------------------------- */

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.search && {
    OR: [
      { name: { contains: filters.search } },
      { city: { contains: filters.search } },
    ],
  }),
  ...(filters.status !== undefined && { status: filters.status }),
  ...(filters.isActive !== undefined && { isActive: filters.isActive }),
});

/* ----------------------------------
   Repository API (NAMED EXPORTS)
----------------------------------- */

export const createProperty = (data: {
  tenantId: string;
  createdByUserId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status?: PropertyStatus;
  amenities?: {
    createMany: {
      data: { amenityId: string }[];
    };
  };
}) => {
  return prisma.property.create({
    data: {
      tenant: {
        connect: {
          id: data.tenantId,
        },
      },
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      createdBy: {
        connect: {
          id: data.createdByUserId,
        },
      },
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenities !== undefined && { amenities: data.amenities }),
    },
    include: { amenities: true },
  });
};

export const findPropertyById = (id: string) => {
  return prisma.property.findUnique({
    where: { id },
    include: { amenities: true },
  });
};

export const updatePropertyById = (
  id: string,
  data: Partial<{
    name: string;
    address: string;
    city: string;
    state: string;
    status: PropertyStatus;
    isActive: boolean;
  }>,
) => {
  return prisma.property.update({
    where: { id },
    data,
  });
};

export const listProperties = ({
  page,
  limit,
  search,
  status,
  isActive,
}: RepoListFilters) => {
  const where = buildWhere({
    ...(search !== undefined && { search }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.property.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
};

export const countProperties = ({
  search,
  status,
  isActive,
}: Omit<RepoListFilters, "page" | "limit">) => {
  const where = buildWhere({
    ...(search !== undefined && { search }),
    ...(status !== undefined && { status }),
    ...(isActive !== undefined && { isActive }),
  });

  return prisma.property.count({ where });
};

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

export const replacePropertyAmenities = async (
  propertyId: string,
  amenityIds: string[],
) => {
  return prisma.$transaction(async (tx) => {
    // Remove existing
    await tx.propertyAmenity.deleteMany({
      where: { propertyId },
    });

    // Insert new
    if (amenityIds.length > 0) {
      await tx.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          propertyId,
          amenityId,
        })),
      });
    }

    // Return updated property with amenities
    return tx.property.findUnique({
      where: { id: propertyId },
      include: { amenities: true },
    });
  });
};
