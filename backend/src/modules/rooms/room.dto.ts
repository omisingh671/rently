import type { RoomStatus, UnitStatus } from "@/generated/prisma/enums.js";

export interface RoomResponseDto {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  name: string;
  number: string;
  hasAC: boolean;
  maxOccupancy: number;
  status: RoomStatus;
  isActive: boolean;
  unitStatus: UnitStatus;
  unitIsActive: boolean;
  amenityIds: string[];
  createdAt: Date;
  updatedAt: Date;
}
