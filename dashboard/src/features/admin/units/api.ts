import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type {
  AdminUnit,
  PaginatedUnitsResponse,
  CreateUnitPayload,
  UpdateUnitPayload,
} from "./types";

import type { ApiSuccessResponse } from "@/common/types/api";

/* ---------------- LIST ---------------- */

export const listUnitsApi = async (
  propertyId: string,
  params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    isActive?: boolean;
  },
): Promise<PaginatedUnitsResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<PaginatedUnitsResponse>
  >(API_ENDPOINTS.units.byProperty(propertyId), { params });

  return data.data;
};

/* ---------------- GET BY ID ---------------- */

export const getUnitByIdApi = async (unitId: string): Promise<AdminUnit> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<AdminUnit>>(
    API_ENDPOINTS.units.byId(unitId),
  );

  return data.data;
};

/* ---------------- CREATE ---------------- */

export const createUnitApi = async (
  propertyId: string,
  payload: CreateUnitPayload,
): Promise<AdminUnit> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminUnit>>(
    API_ENDPOINTS.units.byProperty(propertyId),
    payload,
  );

  return data.data;
};

/* ---------------- UPDATE ---------------- */

export const updateUnitApi = async (
  unitId: string,
  payload: UpdateUnitPayload,
): Promise<AdminUnit> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminUnit>>(
    API_ENDPOINTS.units.byId(unitId),
    payload,
  );

  return data.data;
};

/* ---------------- DELETE ---------------- */

export const deleteUnitApi = async (unitId: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.units.byId(unitId));
};
