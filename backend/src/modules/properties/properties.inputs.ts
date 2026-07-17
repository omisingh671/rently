import type { PropertyStatus } from "@/generated/prisma/enums.js";

export interface CreatePropertyInput {
  tenantId: string;
  createdByUserId: string;
  slug?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: PropertyStatus;
  amenityIds?: string[];
}

export interface UpdatePropertyInput {
  slug?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
  tenantId?: string;
  propertyIds?: string[];
}
