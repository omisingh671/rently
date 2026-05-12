import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { PaginatedResult } from "@/common/types/pagination";
import type { ApiSuccessResponse } from "@/common/types/api";
import type {
  AdminUser,
  AdminUserScope,
  CreateUserPayload,
  UpdateUserVariables,
} from "./types";

const scopeEndpoints = (scope: AdminUserScope) =>
  scope === "admins" ? API_ENDPOINTS.admins : API_ENDPOINTS.managers;

/* ---------------- LIST ---------------- */

export const fetchAdminUsers = async (
  scope: AdminUserScope,
  page: number,
  limit: number,
  filters: {
    search?: string;
    isActive?: boolean;
  },
): Promise<PaginatedResult<AdminUser>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminUser>>
  >(scopeEndpoints(scope).list, {
    params: {
      page,
      limit,
      ...filters,
    },
  });

  return res.data.data;
};

/* ---------------- CREATE ---------------- */

export const createUser = async (
  scope: AdminUserScope,
  payload: CreateUserPayload,
): Promise<AdminUser> => {
  const res = await axiosInstance.post<ApiSuccessResponse<AdminUser>>(
    scopeEndpoints(scope).create,
    payload,
  );

  return res.data.data;
};

/* ---------------- UPDATE ---------------- */

export const updateUser = async (
  scope: AdminUserScope,
  variables: UpdateUserVariables,
): Promise<void> => {
  const { userId, payload } = variables;

  await axiosInstance.patch(scopeEndpoints(scope).updateById(userId), payload);
};
