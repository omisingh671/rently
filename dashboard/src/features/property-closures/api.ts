import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  AdminPropertyClosure,
  CreatePropertyClosurePayload,
  PropertyClosureListResponse,
} from "./types";

export const listPropertyClosuresApi = async (
  propertyId: string,
): Promise<PropertyClosureListResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<PropertyClosureListResponse>
  >(API_ENDPOINTS.propertyClosures.byProperty(propertyId), {
    params: { page: 1, limit: 100 },
  });
  return data.data;
};

export const createPropertyClosureApi = async (
  payload: CreatePropertyClosurePayload,
): Promise<AdminPropertyClosure> => {
  const { propertyId, ...body } = payload;
  const { data } = await axiosInstance.post<
    ApiSuccessResponse<AdminPropertyClosure>
  >(API_ENDPOINTS.propertyClosures.byProperty(propertyId), body);
  return data.data;
};

export const cancelPropertyClosureApi = async (
  closureId: string,
  reason: string,
): Promise<AdminPropertyClosure> => {
  const { data } = await axiosInstance.patch<
    ApiSuccessResponse<AdminPropertyClosure>
  >(API_ENDPOINTS.propertyClosures.cancelById(closureId), { reason });
  return data.data;
};
