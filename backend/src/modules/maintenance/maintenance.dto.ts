import type { MaintenanceTargetType } from "@/generated/prisma/enums.js";

export interface MaintenanceBlockResponseDto {
  id: string;
  propertyId: string;
  propertyName: string;
  targetType: MaintenanceTargetType;
  unitId: string | null;
  unitNumber: string | null;
  roomId: string | null;
  roomLabel: string | null;
  reason: string | null;
  startDate: Date;
  endDate: Date;
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}
