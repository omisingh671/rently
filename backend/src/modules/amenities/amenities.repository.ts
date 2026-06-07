import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import { randomUUID } from "node:crypto";
import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  ListAmenitiesFilters,
} from "./amenities.inputs.js";

const amenitySelect = {
  id: true,
  name: true,
  icon: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.AmenitySelect;

export const createAmenity = async (data: CreateAmenityInput) => {
  const id = randomUUID();

  await prisma.$executeRaw`
    INSERT INTO amenities (id, name, icon, isActive, createdAt)
    VALUES (${id}, ${data.name}, ${data.icon ?? null}, true, NOW(3))
  `;

  return prisma.amenity.findUniqueOrThrow({
    where: { id },
    select: amenitySelect,
  });
};

export const findAmenityById = (id: string) => {
  return prisma.amenity.findUnique({ where: { id }, select: amenitySelect });
};

export const updateAmenityById = (id: string, data: UpdateAmenityInput) => {
  return prisma.amenity.update({
    where: { id },
    data,
    select: amenitySelect,
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
    select: amenitySelect,
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

export const countActiveAmenitiesByIds = (ids: string[]) =>
  prisma.amenity.count({
    where: {
      id: { in: ids },
      isActive: true,
    },
  });

export const listPropertyAmenityIds = async (propertyId: string) => {
  const rows = await prisma.propertyAmenity.findMany({
    where: { propertyId },
    select: { amenityId: true },
  });

  return rows.map((row) => row.amenityId);
};

export const replacePropertyAmenities = async (
  propertyId: string,
  amenityIds: string[],
) => {
  return prisma.$transaction(async (tx) => {
    await tx.propertyAmenity.deleteMany({
      where: { propertyId },
    });

    if (amenityIds.length > 0) {
      await tx.propertyAmenity.createMany({
        data: amenityIds.map((amenityId) => ({
          propertyId,
          amenityId,
        })),
      });
    }

    const rows = await tx.propertyAmenity.findMany({
      where: { propertyId },
      select: { amenityId: true },
    });

    return rows.map((row) => row.amenityId);
  });
};
