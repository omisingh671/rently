import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { ApiSuccessResponse } from "@/common/types/api";
import type { PaginatedResult } from "@/common/types/pagination";

import type {
  CreateAmenityPayload,
  UpdateAmenityVariables,
  Amenity,
} from "./types";

/* ---------------- LIST ---------------- */

export const fetchAdminAmenities = async (
  propertyId: string,
  page: number,
  limit: number,
  filters: {
    search?: string;
    isActive?: boolean;
  },
): Promise<PaginatedResult<Amenity>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<Amenity>>
  >(API_ENDPOINTS.amenities.byProperty(propertyId), {
    params: {
      page,
      limit,
      ...filters,
    },
  });

  return res.data.data;
};

/* ---------------- CREATE ---------------- */

export const createAmenity = async (
  propertyId: string,
  payload: CreateAmenityPayload,
): Promise<Amenity> => {
  const res = await axiosInstance.post<ApiSuccessResponse<Amenity>>(
    API_ENDPOINTS.amenities.create(propertyId),
    payload,
  );

  return res.data.data;
};

/* ---------------- UPDATE ---------------- */

export const updateAmenity = async (
  variables: UpdateAmenityVariables,
): Promise<Amenity> => {
  const { amenityId, payload } = variables;

  const res = await axiosInstance.patch<ApiSuccessResponse<Amenity>>(
    API_ENDPOINTS.amenities.updateById(amenityId),
    payload,
  );

  return res.data.data;
};

/* ---------------- GET BY ID ---------------- */

export const fetchAmenityById = async (amenityId: string): Promise<Amenity> => {
  const res = await axiosInstance.get<ApiSuccessResponse<Amenity>>(
    API_ENDPOINTS.amenities.byId(amenityId),
  );

  return res.data.data;
};
