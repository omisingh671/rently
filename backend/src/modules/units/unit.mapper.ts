import type { Unit, UnitAmenity } from "@/generated/prisma/client.js";
import type { UnitResponseDto } from "./unit.dto.js";

export function toUnitResponseDto(
  unit: Unit & { amenities?: UnitAmenity[] },
): UnitResponseDto {
  return {
    id: unit.id,
    propertyId: unit.propertyId,
    unitNumber: unit.unitNumber,
    floor: unit.floor,
    status: unit.status,
    isActive: unit.isActive,
    amenityIds: unit.amenities?.map((a) => a.amenityId) ?? [],
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}
