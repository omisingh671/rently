import type { PaginatedResult } from "@/common/types/pagination";

export type UnitStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type AdminUnit = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;
  amenityIds: string[];
  createdAt: string;
};

/* ---------------- PAGINATION ---------------- */

export type PaginatedUnitsResponse = PaginatedResult<AdminUnit>;

/* ---------------- CREATE ---------------- */

export interface CreateUnitPayload {
  propertyId: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;

  amenityIds?: string[];
}

/* ---------------- UPDATE ---------------- */

export interface UpdateUnitPayload {
  propertyId?: string;
  unitNumber?: string;
  floor?: number;
  status?: UnitStatus;
  isActive?: boolean;

  amenityIds?: string[];
}
