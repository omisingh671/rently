import { HttpError } from "@/common/errors/http-error.js";
import { assertCanManageInventory, getActor } from "@/common/services/scoping.service.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import { PropertyClosureStatus } from "@/generated/prisma/enums.js";
import type { PropertyClosureType } from "@/generated/prisma/enums.js";
import { findPropertyById } from "@/modules/properties/properties.repository.js";
import type { PropertyClosureResponseDto } from "./property-closures.dto.js";
import { toPropertyClosureResponseDto } from "./property-closures.mapper.js";
import * as repo from "./property-closures.repository.js";

const normalizeClosureRange = (startDate: Date, endDate: Date) => {
  if (endDate < startDate) {
    throw new HttpError(
      422,
      "INVALID_DATE_RANGE",
      "End date cannot be before start date",
    );
  }

  if (endDate.getTime() === startDate.getTime()) {
    const exclusiveEndDate = new Date(endDate);
    exclusiveEndDate.setUTCDate(exclusiveEndDate.getUTCDate() + 1);
    return { startDate, endDate: exclusiveEndDate };
  }

  return { startDate, endDate };
};

export const listPropertyClosures = async (
  userId: string,
  filters: repo.PropertyClosureListFilters,
): Promise<PaginatedResult<PropertyClosureResponseDto>> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);
  const result = await repo.listPropertyClosures(filters);

  return {
    items: result.items.map(toPropertyClosureResponseDto),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: result.total,
      totalPages:
        result.total === 0 ? 0 : Math.ceil(result.total / filters.limit),
    },
  };
};

export const createPropertyClosure = async (
  userId: string,
  propertyId: string,
  input: {
    type: PropertyClosureType;
    reason: string;
    startDate: Date;
    endDate: Date;
  },
): Promise<PropertyClosureResponseDto> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  const property = await findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  const range = normalizeClosureRange(input.startDate, input.endDate);

  const closure = await repo.runPropertyClosureTransaction(async (tx) => {
    const [bookings, activeLockCount, overlappingClosureCount] =
      await repo.listClosureConflicts(tx, {
      propertyId,
      ...range,
      at: new Date(),
      });

    if (
      bookings.length > 0 ||
      activeLockCount > 0 ||
      overlappingClosureCount > 0
    ) {
      throw new HttpError(
        409,
        "PROPERTY_CLOSURE_CONFLICT",
        "The closure overlaps active bookings or checkout holds",
        {
          bookings,
          activeInventoryLocks: activeLockCount,
          overlappingPropertyClosures: overlappingClosureCount,
        },
      );
    }

    return repo.createPropertyClosure(tx, {
      property: { connect: { id: propertyId } },
      createdBy: { connect: { id: actor.id } },
      type: input.type,
      reason: input.reason,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  });

  return toPropertyClosureResponseDto(closure);
};

export const cancelPropertyClosure = async (
  userId: string,
  closureId: string,
  reason: string,
): Promise<PropertyClosureResponseDto> => {
  const actor = await getActor(userId);
  const closure = await repo.findPropertyClosureById(closureId);
  if (!closure) {
    throw new HttpError(
      404,
      "PROPERTY_CLOSURE_NOT_FOUND",
      "Property closure not found",
    );
  }
  await assertCanManageInventory(actor, closure.propertyId);
  if (closure.status === PropertyClosureStatus.CANCELLED) {
    return toPropertyClosureResponseDto(closure);
  }

  const cancelled = await repo.runPropertyClosureTransaction((tx) =>
    repo.cancelPropertyClosure(tx, closureId, {
      cancelledByUserId: actor.id,
      cancelledAt: new Date(),
      cancellationReason: reason,
    }),
  );

  return toPropertyClosureResponseDto(cancelled);
};
