import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { ApiSuccessResponse } from "@/common/types/api";
import type { PaginatedResult } from "@/common/types/pagination";

import type {
  UpdatePropertyVariables,
  CreatePropertyPayload,
  AdminProperty,
} from "./types";

/* ---------------- LIST ---------------- */

export const fetchAdminProperties = async (
  page: number,
  limit: number,
  filters: {
    search?: string;
    status?: string;
    isActive?: boolean;
  },
): Promise<PaginatedResult<AdminProperty>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminProperty>>
  >(API_ENDPOINTS.properties.list, {
    params: { page, limit, ...filters },
  });

  return res.data.data;
};

/* ---------------- CREATE ---------------- */

export const createProperty = async (
  payload: CreatePropertyPayload,
): Promise<void> => {
  await axiosInstance.post(API_ENDPOINTS.properties.create, payload);
};

/* ---------------- UPDATE ---------------- */

export const updateProperty = async (
  variables: UpdatePropertyVariables,
): Promise<void> => {
  const { propertyId, payload } = variables;

  await axiosInstance.patch(
    API_ENDPOINTS.properties.updateById(propertyId),
    payload,
  );
};

/* ---------------- GET BY ID ---------------- */

export const fetchPropertyById = async (
  propertyId: string,
): Promise<AdminProperty> => {
  const res = await axiosInstance.get<ApiSuccessResponse<AdminProperty>>(
    API_ENDPOINTS.properties.byId(propertyId),
  );

  return res.data.data;
};
