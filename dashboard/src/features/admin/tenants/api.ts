import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { ApiSuccessResponse } from "@/common/types/api";
import type { PaginatedResult } from "@/common/types/pagination";
import type {
  AdminTenant,
  TenantFormPayload,
  TenantStatus,
  TenantUpdateVariables,
} from "./types";

export const fetchAdminTenants = async (
  page: number,
  limit: number,
  filters: {
    search?: string;
    status?: TenantStatus;
  },
): Promise<PaginatedResult<AdminTenant>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminTenant>>
  >(API_ENDPOINTS.tenants.list, {
    params: { page, limit, ...filters },
  });

  return res.data.data;
};

export const fetchActiveTenants = async (): Promise<AdminTenant[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<AdminTenant[]>>(
    API_ENDPOINTS.tenants.options,
  );

  return res.data.data;
};

export const createTenant = async (
  payload: TenantFormPayload,
): Promise<void> => {
  await axiosInstance.post(API_ENDPOINTS.tenants.create, payload);
};

export const updateTenant = async ({
  tenantId,
  payload,
}: TenantUpdateVariables): Promise<void> => {
  await axiosInstance.patch(API_ENDPOINTS.tenants.updateById(tenantId), payload);
};
