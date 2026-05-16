import type { PaginatedResult } from "@/common/types/pagination";

export type MaintenanceTargetType = "PROPERTY" | "UNIT" | "ROOM";

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
  startDate: string;
  endDate: string;
}

export interface UpdateMaintenancePayload {
  propertyId?: string;
  targetType?: MaintenanceTargetType;
  unitId?: string;
  roomId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
}
