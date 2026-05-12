import type { PropertyStatus } from "@/generated/prisma/enums.js";

export interface CreatePropertyInput {
  tenantId: string;
  createdByUserId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status?: PropertyStatus;
  amenityIds?: string[];
}

export interface UpdatePropertyInput {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: PropertyStatus;
  isActive?: boolean;
  amenityIds?: string[];
}

export interface ListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
}
