import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingOperationEventType,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTargetType,
  UserRole,
} from "@/generated/prisma/enums.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import {
  getActor,
  assertCanManageInventory,
} from "@/common/services/scoping.service.js";
import { findPropertyById } from "../properties/properties.repository.js";
import { UnitRepository } from "../units/unit.repository.js";
import { findRoomById } from "../rooms/room.repository.js";
import * as repo from "./maintenance.repository.js";
import { toMaintenanceBlockResponseDto } from "./maintenance.mapper.js";
import type { MaintenanceBlockResponseDto } from "./maintenance.dto.js";

const unitRepository = new UnitRepository();

// Pagination Helpers
const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
): PaginatedResult<T> => ({
  items,
  pagination: buildPagination(page, limit, total),
});

// Existence and Validation Helpers
const ensurePropertyExists = async (propertyId: string) => {
  const property = await findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  return property;
};

const ensureUnitExists = async (unitId: string) => {
  const unit = await unitRepository.findById(unitId);
  if (!unit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }
  return unit;
};

const ensureRoomExists = async (roomId: string) => {
  const room = await findRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }
  return room;
};

const ensureMaintenanceBlockExists = async (maintenanceBlockId: string) => {
  const block = await repo.findMaintenanceBlockById(maintenanceBlockId);
  if (!block) {
    throw new HttpError(
      404,
      "MAINTENANCE_BLOCK_NOT_FOUND",
      "Maintenance block not found",
    );
  }
  return block;
};

const ensureUnitBelongsToProperty = (
  unit: { propertyId: string },
  propertyId: string,
) => {
  if (unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_UNIT",
      "Unit does not belong to the selected property",
    );
  }
};

const ensureRoomBelongsToProperty = (
  room: { unit: { propertyId: string } },
  propertyId: string,
) => {
  if (room.unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_ROOM",
      "Room does not belong to the selected property",
    );
  }
};

const assertValidDateRange = (startDate: Date, endDate: Date) => {
  if (endDate.getTime() < startDate.getTime()) {
    throw new HttpError(
      400,
      "INVALID_DATE_RANGE",
      "End date cannot be before start date",
    );
  }
};

const normalizeMaintenanceDateRange = (startDate: Date, endDate: Date) => {
  assertValidDateRange(startDate, endDate);

  if (endDate.getTime() === startDate.getTime()) {
    const nextEndDate = new Date(endDate);
    nextEndDate.setUTCDate(nextEndDate.getUTCDate() + 1);
    return {
      startDate,
      endDate: nextEndDate,
    };
  }

  return {
    startDate,
    endDate,
  };
};

const resolveMaintenanceTarget = async (
  propertyId: string,
  input: {
    targetType: MaintenanceTargetType;
    unitId?: string | undefined;
    roomId?: string | undefined;
  },
) => {
  if (input.targetType === MaintenanceTargetType.PROPERTY) {
    return {
      unitId: undefined,
      roomId: undefined,
    };
  }

  if (input.targetType === MaintenanceTargetType.UNIT) {
    if (!input.unitId) {
      throw new HttpError(
        400,
        "UNIT_REQUIRED",
        "Unit is required for unit maintenance blocks",
      );
    }

    const unit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(unit, propertyId);

    return {
      unitId: unit.id,
      roomId: undefined,
    };
  }

  if (!input.roomId) {
    throw new HttpError(
      400,
      "ROOM_REQUIRED",
      "Room is required for room maintenance blocks",
    );
  }

  const room = await ensureRoomExists(input.roomId);
  ensureRoomBelongsToProperty(room, propertyId);

  return {
    unitId: room.unitId,
    roomId: room.id,
  };
};

const assertMaintenanceConflictsAllowed = async (
  actor: Awaited<ReturnType<typeof getActor>>,
  input: {
    propertyId: string;
    targetType: MaintenanceTargetType;
    unitId?: string;
    roomId?: string;
    startDate: Date;
    endDate: Date;
    emergencyOverride?: boolean;
    emergencyReason?: string;
  },
) => {
  const conflicts = await repo.listConflictingBookings(input);
  if (conflicts.length === 0) {
    return conflicts;
  }

  if (input.emergencyOverride !== true) {
    throw new HttpError(
      409,
      "MAINTENANCE_BOOKING_CONFLICT",
      "Maintenance overlaps confirmed or checked-in bookings",
      conflicts,
    );
  }

  if (actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN) {
    throw new HttpError(
      403,
      "MAINTENANCE_OVERRIDE_FORBIDDEN",
      "Only Admin or Super Admin can override maintenance conflicts",
    );
  }

  if (!input.emergencyReason?.trim()) {
    throw new HttpError(
      422,
      "AUDIT_NOTE_REQUIRED",
      "Emergency maintenance reason is required",
    );
  }

  return conflicts;
};

// Maintenance Blocks Service API
export const listMaintenanceBlocks = async (
  userId: string,
  filters: repo.MaintenanceListFilters,
): Promise<PaginatedResult<MaintenanceBlockResponseDto>> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listMaintenancePaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(toMaintenanceBlockResponseDto),
  );
};

export const getMaintenanceBlockById = async (
  userId: string,
  maintenanceBlockId: string,
): Promise<MaintenanceBlockResponseDto> => {
  const actor = await getActor(userId);
  const block = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, block.propertyId);
  return toMaintenanceBlockResponseDto(block);
};

export const createMaintenanceBlock = async (
  userId: string,
  propertyId: string,
  input: {
    targetType: MaintenanceTargetType;
    unitId?: string;
    roomId?: string;
    reason?: string;
    priority: MaintenancePriority;
    assignedToUserId?: string;
    emergencyOverride?: boolean;
    emergencyReason?: string;
    startDate: Date;
    endDate: Date;
  },
): Promise<MaintenanceBlockResponseDto> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  const dateRange = normalizeMaintenanceDateRange(
    input.startDate,
    input.endDate,
  );

  const target = await resolveMaintenanceTarget(propertyId, input);
  const conflicts = await assertMaintenanceConflictsAllowed(actor, {
    propertyId,
    targetType: input.targetType,
    ...(target.unitId !== undefined && { unitId: target.unitId }),
    ...(target.roomId !== undefined && { roomId: target.roomId }),
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(input.emergencyOverride !== undefined && {
      emergencyOverride: input.emergencyOverride,
    }),
    ...(input.emergencyReason !== undefined && {
      emergencyReason: input.emergencyReason,
    }),
  });

  const block = await repo.createMaintenanceBlock({
    property: {
      connect: {
        id: propertyId,
      },
    },
    createdBy: {
      connect: {
        id: actor.id,
      },
    },
    targetType: input.targetType,
    priority: input.priority,
    emergencyOverride: input.emergencyOverride === true,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(target.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
    }),
    ...(target.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
    }),
    ...(input.assignedToUserId !== undefined && {
      assignedTo: { connect: { id: input.assignedToUserId } },
    }),
  });

  if (conflicts.length > 0) {
    await prisma.bookingOperationEvent.createMany({
      data: conflicts.map((booking) => ({
        bookingId: booking.id,
        propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.MAINTENANCE_CONFLICT,
        note: input.emergencyReason ?? null,
        metadata: {
          maintenanceId: block.id,
          targetType: input.targetType,
          priority: input.priority,
        },
      })),
    });
  }

  return toMaintenanceBlockResponseDto(block);
};

export const updateMaintenanceBlock = async (
  userId: string,
  maintenanceBlockId: string,
  input: {
    targetType?: MaintenanceTargetType;
    unitId?: string;
    roomId?: string;
    reason?: string;
    status?: MaintenanceStatus;
    priority?: MaintenancePriority;
    assignedToUserId?: string | null;
    resolutionNote?: string;
    emergencyOverride?: boolean;
    emergencyReason?: string;
    startDate?: Date;
    endDate?: Date;
  },
): Promise<MaintenanceBlockResponseDto> => {
  const actor = await getActor(userId);
  const existingBlock = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, existingBlock.propertyId);

  const nextTargetType = input.targetType ?? existingBlock.targetType;
  const nextStartDate = input.startDate ?? existingBlock.startDate;
  const nextEndDate = input.endDate ?? existingBlock.endDate;
  const dateRange = normalizeMaintenanceDateRange(nextStartDate, nextEndDate);

  const target = await resolveMaintenanceTarget(existingBlock.propertyId, {
    targetType: nextTargetType,
    unitId: input.unitId ?? existingBlock.unitId ?? undefined,
    roomId: input.roomId ?? existingBlock.roomId ?? undefined,
  });
  const conflictRelevantChange =
    nextTargetType !== existingBlock.targetType ||
    target.unitId !== (existingBlock.unitId ?? undefined) ||
    target.roomId !== (existingBlock.roomId ?? undefined) ||
    dateRange.startDate.getTime() !== existingBlock.startDate.getTime() ||
    dateRange.endDate.getTime() !== existingBlock.endDate.getTime() ||
    input.emergencyOverride === true ||
    (input.status !== undefined &&
      input.status !== existingBlock.status &&
      input.status !== MaintenanceStatus.RESOLVED &&
      input.status !== MaintenanceStatus.CANCELLED);
  const conflicts = conflictRelevantChange
    ? await assertMaintenanceConflictsAllowed(actor, {
        propertyId: existingBlock.propertyId,
        targetType: nextTargetType,
        ...(target.unitId !== undefined && { unitId: target.unitId }),
        ...(target.roomId !== undefined && { roomId: target.roomId }),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(input.emergencyOverride !== undefined && {
          emergencyOverride: input.emergencyOverride,
        }),
        ...(input.emergencyReason !== undefined && {
          emergencyReason: input.emergencyReason,
        }),
      })
    : [];

  const block = await repo.updateMaintenanceBlockById(maintenanceBlockId, {
    targetType: nextTargetType,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.status !== undefined && {
      status: input.status,
      ...(input.status === MaintenanceStatus.RESOLVED && {
        resolvedAt: new Date(),
      }),
    }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.resolutionNote !== undefined && {
      resolutionNote: input.resolutionNote,
    }),
    ...(input.emergencyOverride !== undefined && {
      emergencyOverride: input.emergencyOverride,
    }),
    unit:
      target.unitId !== undefined
        ? {
            connect: {
              id: target.unitId,
            },
          }
        : {
            disconnect: true,
          },
    room:
      target.roomId !== undefined
        ? {
            connect: {
              id: target.roomId,
            },
          }
        : {
            disconnect: true,
          },
    ...(input.assignedToUserId !== undefined && {
      assignedTo:
        input.assignedToUserId === null
          ? { disconnect: true }
          : { connect: { id: input.assignedToUserId } },
    }),
  });

  if (conflicts.length > 0 && input.emergencyOverride === true) {
    await prisma.bookingOperationEvent.createMany({
      data: conflicts.map((booking) => ({
        bookingId: booking.id,
        propertyId: existingBlock.propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.MAINTENANCE_CONFLICT,
        note: input.emergencyReason ?? null,
        metadata: {
          maintenanceId: block.id,
          targetType: nextTargetType,
          priority: input.priority ?? existingBlock.priority,
        },
      })),
    });
  }

  return toMaintenanceBlockResponseDto(block);
};

export const deleteMaintenanceBlock = async (
  userId: string,
  maintenanceBlockId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const block = await ensureMaintenanceBlockExists(maintenanceBlockId);
  await assertCanManageInventory(actor, block.propertyId);
  await repo.deleteMaintenanceBlockById(maintenanceBlockId);
};
