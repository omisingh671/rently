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
): Promise<AdminTenant> => {
  const res = await axiosInstance.post<ApiSuccessResponse<AdminTenant>>(
    API_ENDPOINTS.tenants.create,
    payload,
  );
  return res.data.data;
};

export const updateTenant = async ({
  tenantId,
  payload,
}: TenantUpdateVariables): Promise<AdminTenant> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<AdminTenant>>(
    API_ENDPOINTS.tenants.updateById(tenantId),
    payload,
  );
  return res.data.data;
};

export const uploadTenantLogo = async (
  tenantId: string,
  file: File,
): Promise<AdminTenant> => {
  const formData = new FormData();
  formData.append("logo", file);

  const res = await axiosInstance.post<ApiSuccessResponse<AdminTenant>>(
    API_ENDPOINTS.tenants.logo(tenantId),
    formData,
  );
  return res.data.data;
};

export const removeTenantLogo = async (
  tenantId: string,
): Promise<AdminTenant> => {
  const res = await axiosInstance.delete<ApiSuccessResponse<AdminTenant>>(
    API_ENDPOINTS.tenants.logo(tenantId),
  );
  return res.data.data;
};
