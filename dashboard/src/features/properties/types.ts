export type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type AdminProperty = {
  id: string;
  tenantId: string;
  tenantName: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  supportEmail: string | null;
  supportPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  status: PropertyStatus;
  amenityIds?: string[];
  isActive: boolean;
  createdAt: string;
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedPropertiesResponse {
  items: AdminProperty[];
  pagination: PaginationMeta;
}

export interface CreatePropertyPayload {
  tenantId: string;
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

export interface UpdatePropertyPayload {
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
  amenityIds?: string[];
  isActive?: boolean;
}

export interface UpdatePropertyVariables {
  propertyId: string;
  payload: UpdatePropertyPayload;
}
