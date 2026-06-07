import type { RoomProductCategory } from "@/generated/prisma/enums.js";

export interface RoomProductResponseDto {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
  createdAt: Date;
  updatedAt: Date;
}
