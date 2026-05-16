import type { PaginatedResult } from "@/common/types/pagination";

import type { UnitStatus } from "../units/types";
export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

export type AdminRoom = {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  name: string;
  number: string;
  rent: number;
  hasAC: boolean;
  maxOccupancy: number;
  status: RoomStatus;
  isActive: boolean;
  unitStatus: UnitStatus;
  unitIsActive: boolean;
  amenityIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PaginatedRoomsResponse = PaginatedResult<AdminRoom>;

export interface CreateRoomPayload {
  propertyId: string;
  unitId: string;
  name: string;
  number: string;
  rent: number;
  hasAC: boolean;
  maxOccupancy: number;
  status: RoomStatus;
  isActive: boolean;
  amenityIds?: string[];
}

export interface UpdateRoomPayload {
  propertyId?: string;
  unitId?: string;
  name?: string;
  number?: string;
  rent?: number;
  hasAC?: boolean;
  maxOccupancy?: number;
  status?: RoomStatus;
  isActive?: boolean;
  amenityIds?: string[];
}
