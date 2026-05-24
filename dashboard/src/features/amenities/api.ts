import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { ApiSuccessResponse } from "@/common/types/api";
import type { PaginatedResult } from "@/common/types/pagination";

import type {
  CreateAmenityPayload,
  PropertyAmenityAssignments,
  UpdateAmenityVariables,
  Amenity,
} from "./types";

/* ---------------- LIST ---------------- */

export const fetchAdminAmenities = async (
  page: number,
  limit: number,
  filters: {
    search?: string;
    isActive?: boolean;
  },
): Promise<PaginatedResult<Amenity>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<Amenity>>
  >(API_ENDPOINTS.amenities.list, {
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
  payload: CreateAmenityPayload,
): Promise<Amenity> => {
  const res = await axiosInstance.post<ApiSuccessResponse<Amenity>>(
    API_ENDPOINTS.amenities.create,
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

export const fetchPropertyAmenityAssignments = async (
  propertyId: string,
): Promise<PropertyAmenityAssignments> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PropertyAmenityAssignments>
  >(API_ENDPOINTS.amenities.assignmentsByProperty(propertyId));

  return res.data.data;
};

export const replacePropertyAmenityAssignments = async (
  propertyId: string,
  payload: PropertyAmenityAssignments,
): Promise<PropertyAmenityAssignments> => {
  const res = await axiosInstance.put<
    ApiSuccessResponse<PropertyAmenityAssignments>
  >(API_ENDPOINTS.amenities.assignmentsByProperty(propertyId), payload);

  return res.data.data;
};
