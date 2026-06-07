import type { RoomProductRecord } from "./room-product.repository.js";
import type { RoomProductResponseDto } from "./room-product.dto.js";

export const toRoomProductResponseDto = (
  product: RoomProductRecord,
): RoomProductResponseDto => ({
  id: product.id,
  propertyId: product.propertyId,
  propertyName: product.property.name,
  name: product.name,
  occupancy: product.occupancy,
  hasAC: product.hasAC,
  category: product.category,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});
