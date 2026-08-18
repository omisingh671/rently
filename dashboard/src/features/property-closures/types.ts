import type { PaginatedResult } from "@/common/types/pagination";

export type PropertyClosureType = "HOLIDAY_CLOSURE" | "OWNER_BLOCK";
export type PropertyClosureStatus = "ACTIVE" | "CANCELLED";

export interface AdminPropertyClosure {
  id: string;
  propertyId: string;
  propertyName: string;
  type: PropertyClosureType;
  status: PropertyClosureStatus;
  reason: string;
  startDate: string;
  endDate: string;
  createdByUserId: string;
  createdByName: string;
  cancelledByUserId: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PropertyClosureListResponse = PaginatedResult<AdminPropertyClosure>;

export interface CreatePropertyClosurePayload {
  propertyId: string;
  type: PropertyClosureType;
  reason: string;
  startDate: string;
  endDate: string;
}
