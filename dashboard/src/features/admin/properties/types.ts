export type PropertyStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";

export type AdminProperty = {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  address: string;
  city: string;
  state: string;
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
  name: string;
  address: string;
  city: string;
  state: string;
  status?: PropertyStatus;
  amenityIds?: string[];
}

export interface UpdatePropertyPayload {
  tenantId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: PropertyStatus;
  amenityIds?: string[];
  isActive?: boolean;
}

export interface UpdatePropertyVariables {
  propertyId: string;
  payload: UpdatePropertyPayload;
}
