import type {
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTargetType,
} from "@/generated/prisma/enums.js";

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
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  assignedToUserId: string | null;
  assignedToName: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  emergencyOverride: boolean;
  startDate: Date;
  endDate: Date;
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}
