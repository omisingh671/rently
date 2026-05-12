import type { UnitStatus } from "@/generated/prisma/enums.js";

export interface UnitResponseDto {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;
  amenityIds: string[];

  createdAt: Date;
  updatedAt: Date;
}
