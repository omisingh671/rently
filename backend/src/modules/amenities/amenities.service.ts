import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";

import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  ListAmenitiesFilters,
} from "./amenities.inputs.js";

import type { AmenityDTO } from "./amenities.dto.js";
import * as repo from "./amenities.repository.js";

type AmenityRecord = Awaited<ReturnType<typeof repo.createAmenity>>;

const mapAmenity = (a: AmenityRecord): AmenityDTO => ({
  id: a.id,
  name: a.name,
  icon: a.icon,
  isActive: a.isActive,
  createdAt: a.createdAt,
});

/**
 * Create Amenity
 */
export const createAmenity = async (
  data: CreateAmenityInput,
): Promise<AmenityDTO> => {
  try {
    const amenity = await repo.createAmenity({
      propertyId: data.propertyId,
      name: data.name,
      ...(data.icon !== undefined && { icon: data.icon }),
    });

    return mapAmenity(amenity);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "AMENITY_EXISTS", "Amenity already exists");
    }

    throw err;
  }
};

/**
 * Get Amenity by ID
 */
export const getAmenityById = async (id: string): Promise<AmenityDTO> => {
  const amenity = await repo.findAmenityById(id);

  if (!amenity) {
    throw new HttpError(404, "NOT_FOUND", "Amenity not found");
  }

  return mapAmenity(amenity);
};

/**
 * Update Amenity
 */
export const updateAmenity = async (
  id: string,
  data: UpdateAmenityInput,
): Promise<AmenityDTO> => {
  try {
    const amenity = await repo.updateAmenityById(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    return mapAmenity(amenity);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "AMENITY_EXISTS", "Amenity already exists");
    }

    throw err;
  }
};

/**
 * Admin list Amenities
 */
export const listAmenities = async ({
  page,
  limit,
  search,
  isActive,
}: ListAmenitiesFilters) => {
  const [items, total] = await Promise.all([
    repo.listAmenities({
      page,
      limit,
      ...(search !== undefined && { search }),
      ...(isActive !== undefined && { isActive }),
    }),
    repo.countAmenities({
      ...(search !== undefined && { search }),
      ...(isActive !== undefined && { isActive }),
    }),
  ]);

  return {
    items: items.map(mapAmenity),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
