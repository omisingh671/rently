import { prisma } from "@/db/prisma.js";
import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  ListAmenitiesFilters,
} from "./amenities.inputs.js";

export const createAmenity = (data: CreateAmenityInput) => {
  return prisma.amenity.create({
    data: {
      property: {
        connect: {
          id: data.propertyId,
        },
      },
      name: data.name,
      ...(data.icon !== undefined && { icon: data.icon }),
    },
  });
};

export const findAmenityById = (id: string) => {
  return prisma.amenity.findUnique({ where: { id } });
};

export const updateAmenityById = (id: string, data: UpdateAmenityInput) => {
  return prisma.amenity.update({
    where: { id },
    data,
  });
};

export const listAmenities = ({
  page,
  limit,
  search,
  isActive,
}: ListAmenitiesFilters) => {
  const where = {
    ...(search !== undefined && {
      name: {
        contains: search,
      },
    }),
    ...(isActive !== undefined && { isActive }),
  };

  return prisma.amenity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
};

export const countAmenities = ({
  search,
  isActive,
}: Omit<ListAmenitiesFilters, "page" | "limit">) => {
  const where = {
    ...(search !== undefined && {
      name: {
        contains: search,
      },
    }),
    ...(isActive !== undefined && { isActive }),
  };

  return prisma.amenity.count({ where });
};
