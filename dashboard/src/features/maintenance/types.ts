import type { PaginatedResult } from "@/common/types/pagination";

export type MaintenanceTargetType = "PROPERTY" | "UNIT" | "ROOM";
export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CANCELLED";
export type MaintenancePriority = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export type AdminMaintenanceBlock = {
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
  resolvedAt: string | null;
  emergencyOverride: boolean;
  startDate: string;
  endDate: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedMaintenanceResponse =
  PaginatedResult<AdminMaintenanceBlock>;

export interface CreateMaintenancePayload {
  propertyId: string;
  targetType: MaintenanceTargetType;
  unitId?: string;
  roomId?: string;
  reason?: string;
  priority: MaintenancePriority;
  emergencyOverride?: boolean;
  emergencyReason?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateMaintenancePayload {
  propertyId?: string;
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
  startDate?: string;
  endDate?: string;
}
