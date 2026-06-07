import type { PaginatedResult } from "@/common/types/pagination.js";
import { HttpError } from "@/common/errors/http-error.js";

import {
  UnitRepository,
  countActiveAmenitiesByIds,
  replaceUnitAmenities,
} from "./unit.repository.js";

import { toUnitResponseDto } from "./unit.mapper.js";
import type { UnitResponseDto } from "./unit.dto.js";

import type { UnitStatus } from "@/generated/prisma/enums.js";
import { findPropertyById } from "../properties/properties.repository.js";
import {
  getActor,
  assertCanManageInventory,
} from "@/common/services/scoping.service.js";

const unitRepository = new UnitRepository();

interface ListUnitsParams {
  propertyId: string;
  page: number;
  pageSize: number;
  search?: string;
  status?: UnitStatus;
  isActive?: boolean;
}

interface CreateUnitInput {
  propertyId: string;
  unitNumber: string;
  floor: number;
  status?: UnitStatus;
  amenityIds?: string[];
}

interface UpdateUnitInput {
  unitNumber?: string;
  floor?: number;
  status?: UnitStatus;
  isActive?: boolean;
  amenityIds?: string[];
}

/**
 * Create unit
 */
export const create = async (
  userId: string,
  input: CreateUnitInput,
): Promise<UnitResponseDto> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, input.propertyId);

  const property = await findPropertyById(input.propertyId);

  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  const exists = await unitRepository.existsByPropertyAndUnitNumber(
    input.propertyId,
    input.unitNumber,
  );

  if (exists) {
    throw new HttpError(
      400,
      "UNIT_ALREADY_EXISTS",
      "Unit number already exists for this property",
    );
  }

  const unit = await unitRepository.create({
    property: { connect: { id: input.propertyId } },
    unitNumber: input.unitNumber,
    floor: input.floor,
    ...(input.status !== undefined && { status: input.status }),
  });

  /**
   * Handle amenities
   */
  if (input.amenityIds !== undefined) {
    const count = await countActiveAmenitiesByIds(input.amenityIds);

    if (count !== input.amenityIds.length) {
      throw new HttpError(
        400,
        "INVALID_AMENITIES",
        "Some amenities are invalid or inactive",
      );
    }

    const unitWithAmenities = await replaceUnitAmenities(
      unit.id,
      input.amenityIds,
    );

    return toUnitResponseDto(unitWithAmenities!);
  }

  return toUnitResponseDto(unit);
};

/**
 * Update unit
 */
export const update = async (
  userId: string,
  id: string,
  input: UpdateUnitInput,
): Promise<UnitResponseDto> => {
  const actor = await getActor(userId);
  const existing = await unitRepository.findById(id);

  if (!existing) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  await assertCanManageInventory(actor, existing.propertyId);

  /**
   * Prevent duplicate unit numbers
   */
  if (
    input.unitNumber !== undefined &&
    input.unitNumber !== existing.unitNumber
  ) {
    const duplicate = await unitRepository.existsByPropertyAndUnitNumber(
      existing.propertyId,
      input.unitNumber,
    );

    if (duplicate) {
      throw new HttpError(
        400,
        "UNIT_ALREADY_EXISTS",
        "Unit number already exists for this property",
      );
    }
  }

  const updated = await unitRepository.update(id, {
    ...(input.unitNumber !== undefined && {
      unitNumber: input.unitNumber,
    }),
    ...(input.floor !== undefined && {
      floor: input.floor,
    }),
    ...(input.status !== undefined && {
      status: input.status,
    }),
    ...(input.isActive !== undefined && {
      isActive: input.isActive,
    }),
  });

  /**
   * Replace amenities
   */
  if (input.amenityIds !== undefined) {
    const count = await countActiveAmenitiesByIds(input.amenityIds);

    if (count !== input.amenityIds.length) {
      throw new HttpError(
        400,
        "INVALID_AMENITIES",
        "Some amenities are invalid or inactive",
      );
    }

    const unitWithAmenities = await replaceUnitAmenities(id, input.amenityIds);

    return toUnitResponseDto(unitWithAmenities!);
  }

  return toUnitResponseDto(updated);
};

/**
 * Soft delete
 */
export const softDelete = async (userId: string, id: string): Promise<void> => {
  const actor = await getActor(userId);
  const existing = await unitRepository.findById(id);

  if (!existing) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  await assertCanManageInventory(actor, existing.propertyId);

  await unitRepository.softDelete(id);
};

/**
 * List units by property
 */
export const listByProperty = async (
  userId: string,
  params: ListUnitsParams,
): Promise<PaginatedResult<UnitResponseDto>> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, params.propertyId);

  const property = await findPropertyById(params.propertyId);

  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  const { items, total } = await unitRepository.findByPropertyPaginated(params);

  const totalPages = Math.ceil(total / params.pageSize);

  return {
    items: items.map(toUnitResponseDto),
    pagination: {
      page: params.page,
      limit: params.pageSize,
      total,
      totalPages,
    },
  };
};

/**
 * Get unit by id
 */
export const getById = async (
  userId: string,
  id: string,
): Promise<UnitResponseDto> => {
  const actor = await getActor(userId);
  const unit = await unitRepository.findById(id);

  if (!unit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }

  await assertCanManageInventory(actor, unit.propertyId);

  return toUnitResponseDto(unit);
};
