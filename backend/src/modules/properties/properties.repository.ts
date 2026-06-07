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
  tenantId?: string;
  propertyIds?: string[];
};

type WhereFilters = {
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
  tenantId?: string;
  propertyIds?: string[];
};

/* ----------------------------------
   Helpers
----------------------------------- */

const buildWhere = (filters: WhereFilters) => ({
  ...(filters.tenantId !== undefined && { tenantId: filters.tenantId }),
  ...(filters.propertyIds !== undefined && {
    id: { in: filters.propertyIds },
  }),
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
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
      slug: data.slug,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      ...(data.supportEmail !== undefined && {
        supportEmail: data.supportEmail,
      }),
      ...(data.supportPhone !== undefined && {
        supportPhone: data.supportPhone,
      }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      createdBy: {
        connect: {
          id: data.createdByUserId,
        },
      },
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenities !== undefined && { amenities: data.amenities }),
    },
    include: { amenities: true, tenant: true },
  });
};

export const findPropertyById = (id: string) => {
  return prisma.property.findUnique({
    where: { id },
    include: { amenities: true, tenant: true },
  });
};

export const updatePropertyById = (
  id: string,
  data: Partial<{
    tenantId: string;
    name: string;
    slug: string;
    address: string;
    city: string;
    state: string;
    supportEmail: string | null;
    supportPhone: string | null;
    latitude: number | null;
    longitude: number | null;
    status: PropertyStatus;
    isActive: boolean;
  }>,
) => {
  return prisma.property.update({
    where: { id },
    data,
  });
};

export const listProperties = (filters: RepoListFilters) => {
  const where = buildWhere(filters);

  return prisma.property.findMany({
    where,
    include: { amenities: true, tenant: true },
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
    orderBy: { createdAt: "desc" },
  });
};

export const countProperties = (
  filters: Omit<RepoListFilters, "page" | "limit">,
) => {
  const where = buildWhere(filters);

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
      include: { amenities: true, tenant: true },
    });
  });
};
