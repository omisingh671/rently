import { Prisma, UserRole } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  assertCanManageInventory,
  ensurePropertyExists,
} from "@/common/services/scoping.service.js";

import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  ListAmenitiesFilters,
  ReplacePropertyAmenityAssignmentsInput,
} from "./amenities.inputs.js";

import type {
  AmenityDTO,
  PropertyAmenityAssignmentsDTO,
} from "./amenities.dto.js";
import * as repo from "./amenities.repository.js";

type AmenityRecord = Awaited<ReturnType<typeof repo.createAmenity>>;

const mapAmenity = (a: AmenityRecord): AmenityDTO => ({
  id: a.id,
  name: a.name,
  icon: a.icon,
  isActive: a.isActive,
  createdAt: a.createdAt,
});

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  },
});

const assertRole = (actor: { role: UserRole }, roles: UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const ensureAmenityExists = async (amenityId: string) => {
  const amenity = await repo.findAmenityById(amenityId);
  if (!amenity) {
    throw new HttpError(404, "AMENITY_NOT_FOUND", "Amenity not found");
  }
  return amenity;
};

const ensureAmenityIdsExistAndAreActive = async (amenityIds: string[]) => {
  if (amenityIds.length === 0) {
    return;
  }
  const count = await repo.countActiveAmenitiesByIds(amenityIds);
  if (count !== amenityIds.length) {
    throw new HttpError(
      400,
      "INVALID_AMENITIES",
      "Some amenities are invalid or inactive",
    );
  }
};

const uniqueIds = (ids: Array<string | null | undefined>) =>
  Array.from(
    new Set(ids.filter((id): id is string => id !== null && id !== undefined)),
  );

/**
 * Create Amenity
 */
export const createAmenity = async (
  userId: string,
  data: CreateAmenityInput,
): Promise<AmenityDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  try {
    const amenity = await repo.createAmenity({
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
export const getAmenityById = async (
  userId: string,
  id: string,
): Promise<AmenityDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const amenity = await ensureAmenityExists(id);
  return mapAmenity(amenity);
};

/**
 * Update Amenity
 */
export const updateAmenity = async (
  userId: string,
  id: string,
  data: UpdateAmenityInput,
): Promise<AmenityDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);
  await ensureAmenityExists(id);

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
 * List Amenities
 */
export const listAmenities = async (
  userId: string,
  filters: ListAmenitiesFilters,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const [items, total] = await Promise.all([
    repo.listAmenities(filters),
    repo.countAmenities(filters),
  ]);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapAmenity),
  );
};

/**
 * Get Property Amenity Assignments
 */
export const getPropertyAmenityAssignments = async (
  userId: string,
  propertyId: string,
): Promise<PropertyAmenityAssignmentsDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const amenityIds = await repo.listPropertyAmenityIds(propertyId);
  return { amenityIds };
};

/**
 * Replace Property Amenity Assignments
 */
export const replacePropertyAmenityAssignments = async (
  userId: string,
  propertyId: string,
  input: ReplacePropertyAmenityAssignmentsInput,
): Promise<PropertyAmenityAssignmentsDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const amenityIds = uniqueIds(input.amenityIds);
  await ensureAmenityIdsExistAndAreActive(amenityIds);

  const replacedIds = await repo.replacePropertyAmenities(propertyId, amenityIds);
  return { amenityIds: replacedIds };
};
