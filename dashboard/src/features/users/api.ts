import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

import type { PaginatedResult } from "@/common/types/pagination";
import type { ApiSuccessResponse } from "@/common/types/api";
import type {
  AdminUser,
  AdminSession,
  AdminSessionsFilters,
  AdminUserScope,
  CreateUserPayload,
  ManagedUserDetailsVariables,
  ManagedUsersFilters,
  ManagedUserForcePasswordVariables,
  ManagedUserRoleVariables,
  ManagedUserStatusVariables,
  UpdateUserVariables,
} from "./types";

const scopeEndpoints = (scope: AdminUserScope) =>
  scope === "admins" ? API_ENDPOINTS.admins : API_ENDPOINTS.teamUsers;

/* ---------------- LIST ---------------- */

export const fetchAdminUsers = async (
  scope: AdminUserScope,
  page: number,
  limit: number,
  filters: {
    search?: string;
    isActive?: boolean;
    role?: "MANAGER" | "FRONT_DESK" | "ACCOUNTANT";
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

/* ---------------- GLOBAL USERS ---------------- */

export const fetchManagedUsers = async (
  page: number,
  limit: number,
  filters: ManagedUsersFilters,
): Promise<PaginatedResult<AdminUser>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminUser>>
  >(API_ENDPOINTS.users.list, {
    params: {
      page,
      limit,
      ...filters,
      ...(filters.search === "" && { search: undefined }),
      ...(filters.role === "" && { role: undefined }),
    },
  });

  return res.data.data;
};

export const updateManagedUserStatus = async ({
  userId,
  isActive,
}: ManagedUserStatusVariables): Promise<AdminUser> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<AdminUser>>(
    API_ENDPOINTS.users.statusById(userId),
    { isActive },
  );

  return res.data.data;
};

export const updateManagedUserDetails = async ({
  userId,
  fullName,
}: ManagedUserDetailsVariables): Promise<void> => {
  await axiosInstance.patch(API_ENDPOINTS.users.byId(userId), { fullName });
};

export const updateManagedUserRole = async ({
  userId,
  role,
}: ManagedUserRoleVariables): Promise<AdminUser> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<AdminUser>>(
    API_ENDPOINTS.users.roleById(userId),
    { role },
  );

  return res.data.data;
};

export const triggerManagedUserPasswordReset = async (
  userId: string,
): Promise<void> => {
  await axiosInstance.post(API_ENDPOINTS.users.passwordResetEmailById(userId));
};

export const updateManagedUserForcePasswordChange = async ({
  userId,
  mustChangePassword,
}: ManagedUserForcePasswordVariables): Promise<AdminUser> => {
  const res = await axiosInstance.patch<ApiSuccessResponse<AdminUser>>(
    API_ENDPOINTS.users.forcePasswordChangeById(userId),
    { mustChangePassword },
  );

  return res.data.data;
};

export const revokeManagedUserSessions = async (
  userId: string,
): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.users.sessionsByUserId(userId));
};

/* ---------------- SESSIONS ---------------- */

export const fetchAdminSessions = async (
  page: number,
  limit: number,
  filters: AdminSessionsFilters,
): Promise<PaginatedResult<AdminSession>> => {
  const res = await axiosInstance.get<
    ApiSuccessResponse<PaginatedResult<AdminSession>>
  >(API_ENDPOINTS.sessions.list, {
    params: {
      page,
      limit,
      ...filters,
      ...(filters.search === "" && { search: undefined }),
      ...(filters.role === "" && { role: undefined }),
      ...(filters.status === "" && { status: undefined }),
    },
  });

  return res.data.data;
};

export const revokeAdminSession = async (
  sessionId: string,
): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.sessions.deleteById(sessionId));
};

export const revokeExpiredAdminSessions = async (): Promise<{
  count: number;
}> => {
  const res = await axiosInstance.delete<
    ApiSuccessResponse<{ count: number }>
  >(API_ENDPOINTS.sessions.deleteExpired);

  return res.data.data;
};
