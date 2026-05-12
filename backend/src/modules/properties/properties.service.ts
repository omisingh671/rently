import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";

import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  ListFilters,
} from "./properties.inputs.js";

import type { PropertyDTO } from "./properties.dto.js";
import * as repo from "./properties.repository.js";

type PropertyRecord = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: PropertyDTO["status"];
  isActive: boolean;
  createdAt: Date;
  amenities?: Array<{
    amenityId: string;
  }>;
};

const mapProperty = (p: PropertyRecord): PropertyDTO => ({
  id: p.id,
  name: p.name,
  address: p.address,
  city: p.city,
  state: p.state,
  status: p.status,
  isActive: p.isActive,
  createdAt: p.createdAt,
  amenityIds: p.amenities?.map((a) => a.amenityId) ?? [],
});

export const createProperty = async (
  data: CreatePropertyInput,
): Promise<PropertyDTO> => {
  try {
    const property = await repo.createProperty({
      tenantId: data.tenantId,
      createdByUserId: data.createdByUserId,
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      ...(data.status !== undefined && { status: data.status }),
      ...(data.amenityIds !== undefined && {
        amenities: {
          createMany: {
            data: data.amenityIds.map((id) => ({ amenityId: id })),
          },
        },
      }),
    });

    return mapProperty(property);
  } catch {
    throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
  }
};

export const getPropertyById = async (id: string): Promise<PropertyDTO> => {
  const property = await repo.findPropertyById(id);

  if (!property) {
    throw new HttpError(404, "NOT_FOUND", "Property not found");
  }

  return mapProperty(property);
};

export const updateProperty = async (
  id: string,
  data: UpdatePropertyInput,
): Promise<PropertyDTO> => {
  try {
    const existing = await repo.findPropertyById(id);

    if (!existing) {
      throw new HttpError(404, "NOT_FOUND", "Property not found");
    }

    await repo.updatePropertyById(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    });

    let property;

    if (data.amenityIds !== undefined) {
      if (data.amenityIds.length > 0) {
        const validCount = await repo.countActiveAmenitiesByIds(
          data.amenityIds,
        );

        if (validCount !== data.amenityIds.length) {
          throw new HttpError(
            400,
            "INVALID_AMENITY",
            "One or more amenities are invalid or inactive",
          );
        }
      }

      property = await repo.replacePropertyAmenities(id, data.amenityIds);
    } else {
      property = await repo.findPropertyById(id);
    }

    if (!property) {
      throw new HttpError(404, "NOT_FOUND", "Property not found");
    }

    return mapProperty(property);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "PROPERTY_EXISTS", "Property already exists");
    }

    throw err;
  }
};

export const listProperties = async ({
  page,
  limit,
  search,
  status,
  isActive,
}: ListFilters) => {
  const [items, total] = await Promise.all([
    repo.listProperties({
      page,
      limit,
      ...(search !== undefined && { search }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
    repo.countProperties({
      ...(search !== undefined && { search }),
      ...(status !== undefined && { status }),
      ...(isActive !== undefined && { isActive }),
    }),
  ]);

  return {
    items: items.map(mapProperty),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
