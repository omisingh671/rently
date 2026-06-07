import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import { RoomStatus } from "@/generated/prisma/enums.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import {
  getActor,
  assertCanManageInventory,
} from "@/common/services/scoping.service.js";
import { findPropertyById } from "../properties/properties.repository.js";
import { UnitRepository } from "../units/unit.repository.js";
import * as repo from "./room.repository.js";
import { toRoomResponseDto } from "./room.mapper.js";
import type { RoomResponseDto } from "./room.dto.js";

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
  const room = await repo.findRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }
  return room;
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



const ensureAmenityIdsExistAndAreActive = async (amenityIds: string[]) => {
  if (amenityIds.length === 0) {
    return;
  }

  const count = await prisma.amenity.count({
    where: {
      id: { in: amenityIds },
      isActive: true,
    },
  });

  if (count !== amenityIds.length) {
    throw new HttpError(
      400,
      "INVALID_AMENITIES",
      "Some amenities are invalid or inactive",
    );
  }
};

// Rooms Service API
export const listRooms = async (
  userId: string,
  filters: repo.RoomListFilters,
): Promise<PaginatedResult<RoomResponseDto>> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(toRoomResponseDto),
  );
};

export const getRoomById = async (
  userId: string,
  roomId: string,
): Promise<RoomResponseDto> => {
  const actor = await getActor(userId);
  const room = await ensureRoomExists(roomId);
  await assertCanManageInventory(actor, room.unit.propertyId);
  return toRoomResponseDto(room);
};

export const createRoom = async (
  userId: string,
  propertyId: string,
  input: {
    unitId: string;
    name: string;
    number: string;
    hasAC?: boolean;
    maxOccupancy?: number;
    status?: RoomStatus;
    amenityIds?: string[];
  },
): Promise<RoomResponseDto> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const unit = await ensureUnitExists(input.unitId);
  ensureUnitBelongsToProperty(unit, propertyId);

  const existingRoom = await repo.findRoomByUnitAndNumber(input.unitId, input.number);
  if (existingRoom) {
    throw new HttpError(
      409,
      "ROOM_EXISTS",
      "Room number already exists for this unit",
    );
  }

  await ensureAmenityIdsExistAndAreActive(input.amenityIds ?? []);

  const room = await repo.createRoom({
    unit: {
      connect: {
        id: input.unitId,
      },
    },
    name: input.name,
    number: input.number,
    hasAC: input.hasAC ?? false,
    maxOccupancy: input.maxOccupancy ?? 2,
    ...(input.status !== undefined && { status: input.status }),
  });

  if ((input.amenityIds ?? []).length === 0) {
    return toRoomResponseDto(room);
  }

  const updatedRoom = await repo.replaceRoomAmenities(room.id, input.amenityIds ?? []);
  if (!updatedRoom) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return toRoomResponseDto(updatedRoom);
};

export const updateRoom = async (
  userId: string,
  roomId: string,
  input: {
    unitId?: string;
    name?: string;
    number?: string;
    hasAC?: boolean;
    maxOccupancy?: number;
    status?: RoomStatus;
    isActive?: boolean;
    amenityIds?: string[];
  },
): Promise<RoomResponseDto> => {
  const actor = await getActor(userId);
  const existingRoom = await ensureRoomExists(roomId);
  const propertyId = existingRoom.unit.propertyId;
  await assertCanManageInventory(actor, propertyId);

  let nextUnitId = input.unitId ?? existingRoom.unitId;
  if (input.unitId !== undefined) {
    const nextUnit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(nextUnit, propertyId);
    nextUnitId = nextUnit.id;
  }

  const nextNumber = input.number ?? existingRoom.number;
  if (
    nextUnitId !== existingRoom.unitId ||
    nextNumber !== existingRoom.number
  ) {
    const duplicateRoom = await repo.findRoomByUnitAndNumber(nextUnitId, nextNumber);

    if (duplicateRoom && duplicateRoom.id !== roomId) {
      throw new HttpError(
        409,
        "ROOM_EXISTS",
        "Room number already exists for this unit",
      );
    }
  }

  if (input.amenityIds !== undefined) {
    await ensureAmenityIdsExistAndAreActive(input.amenityIds);
  }

  const room = await repo.updateRoomById(roomId, {
    ...(input.unitId !== undefined && {
      unit: {
        connect: {
          id: input.unitId,
        },
      },
    }),
    ...(input.name !== undefined && { name: input.name }),
    ...(input.number !== undefined && { number: input.number }),
    ...(input.hasAC !== undefined && { hasAC: input.hasAC }),
    ...(input.maxOccupancy !== undefined && {
      maxOccupancy: input.maxOccupancy,
    }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  if (input.amenityIds === undefined) {
    return toRoomResponseDto(room);
  }

  const updatedRoom = await repo.replaceRoomAmenities(roomId, input.amenityIds);
  if (!updatedRoom) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return toRoomResponseDto(updatedRoom);
};

export const deleteRoom = async (
  userId: string,
  roomId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const room = await ensureRoomExists(roomId);
  await assertCanManageInventory(actor, room.unit.propertyId);
  await repo.softDeleteRoomById(roomId);
};
