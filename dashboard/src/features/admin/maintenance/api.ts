import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { ApiSuccessResponse } from "@/common/types/api";
import type {
  AdminMaintenanceBlock,
  CreateMaintenancePayload,
  PaginatedMaintenanceResponse,
  UpdateMaintenancePayload,
} from "./types";

type MaintenanceListParams = {
  page: number;
  limit: number;
  search?: string;
  targetType?: string;
};

const stripPropertyId = <T extends { propertyId?: string }>(
  payload: T,
): Omit<T, "propertyId"> => {
  const body = { ...payload };
  delete body.propertyId;
  return body;
};

export const listMaintenanceApi = async (
  propertyId: string,
  params: MaintenanceListParams,
): Promise<PaginatedMaintenanceResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<PaginatedMaintenanceResponse>
  >(API_ENDPOINTS.maintenance.byProperty(propertyId), { params });

  return data.data;
};

export const createMaintenanceApi = async (
  payload: CreateMaintenancePayload,
): Promise<AdminMaintenanceBlock> => {
  const { data } = await axiosInstance.post<
    ApiSuccessResponse<AdminMaintenanceBlock>
  >(API_ENDPOINTS.maintenance.byProperty(payload.propertyId), stripPropertyId(payload));

  return data.data;
};

export const updateMaintenanceApi = async (
  maintenanceId: string,
  payload: UpdateMaintenancePayload,
): Promise<AdminMaintenanceBlock> => {
  const { data } = await axiosInstance.patch<
    ApiSuccessResponse<AdminMaintenanceBlock>
  >(API_ENDPOINTS.maintenance.byId(maintenanceId), stripPropertyId(payload));

  return data.data;
};

export const deleteMaintenanceApi = async (
  maintenanceId: string,
): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.maintenance.byId(maintenanceId));
};
