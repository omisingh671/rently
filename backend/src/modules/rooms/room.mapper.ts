import type { RoomRecord } from "./room.repository.js";
import type { RoomResponseDto } from "./room.dto.js";

export const toRoomResponseDto = (room: RoomRecord): RoomResponseDto => ({
  id: room.id,
  propertyId: room.unit.propertyId,
  propertyName: room.unit.property.name,
  unitId: room.unitId,
  unitNumber: room.unit.unitNumber,
  name: room.name,
  number: room.number,
  hasAC: room.hasAC,
  maxOccupancy: room.maxOccupancy,
  status: room.status,
  isActive: room.isActive,
  unitStatus: room.unit.status,
  unitIsActive: room.unit.isActive,
  amenityIds: room.amenities.map((amenityLink) => amenityLink.amenityId),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});
