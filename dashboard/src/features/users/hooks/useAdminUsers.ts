import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createUser,
  fetchAdminSessions,
  fetchAdminUsers,
  fetchManagedUsers,
  revokeAdminSession,
  revokeExpiredAdminSessions,
  revokeManagedUserSessions,
  triggerManagedUserPasswordReset,
  updateManagedUserDetails,
  updateManagedUserForcePasswordChange,
  updateManagedUserRole,
  updateManagedUserStatus,
  updateUser,
} from "../api";

import type {
  AdminUser,
  AdminSession,
  AdminSessionsFilters,
  AdminUserScope,
  CreateUserPayload,
  ManagedUserDetailsVariables,
  ManagedUserForcePasswordVariables,
  ManagedUserRoleVariables,
  ManagedUsersFilters,
  ManagedUserStatusVariables,
  UpdateUserVariables,
} from "../types";
import type { PaginatedResult } from "@/common/types/pagination";

import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Filters = {
  search: string;
  isActive: "" | "true" | "false";
};

export function useAdminUsers(
  scope: AdminUserScope,
  page: number,
  limit: number,
  filters: Filters,
) {
  const queryClient = useQueryClient();

  /* ---------------- LIST ---------------- */

  const queryKey = ADMIN_KEYS.users.list({
    scope,
    page,
    limit,
    ...(filters.search && { search: filters.search }),
    ...(filters.isActive && { isActive: filters.isActive }),
  });

  const usersQuery = useQuery<PaginatedResult<AdminUser>>({
    queryKey,
    queryFn: () =>
      fetchAdminUsers(scope, page, limit, {
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive && { isActive: filters.isActive === "true" }),
      }),
    placeholderData: (prev) => prev,
  });

  /* ---------------- UPDATE ---------------- */

  const updateMutation = useMutation({
    mutationFn: (variables: UpdateUserVariables) => updateUser(scope, variables),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.users.all(scope),
      });
    },
  });

  /* ---------------- CREATE ---------------- */

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(scope, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.users.all(scope),
      });
    },
  });

  return {
    ...usersQuery,

    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}

export function useManagedUsers(
  page: number,
  limit: number,
  filters: ManagedUsersFilters,
) {
  const queryClient = useQueryClient();

  const queryKey = ADMIN_KEYS.managedUsers.list({
    page,
    limit,
    ...(filters.search && { search: filters.search }),
    ...(filters.role && { role: filters.role }),
    ...(filters.isActive !== undefined && {
      isActive: String(filters.isActive),
    }),
    ...(filters.mustChangePassword !== undefined && {
      mustChangePassword: String(filters.mustChangePassword),
    }),
  });

  const usersQuery = useQuery<PaginatedResult<AdminUser>>({
    queryKey,
    queryFn: () => fetchManagedUsers(page, limit, filters),
    placeholderData: (prev) => prev,
  });

  const invalidateUsers = () =>
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.managedUsers.all(),
    });

  const invalidateSessions = () =>
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.sessions.all(),
    });

  const createAdminMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser("admins", payload),
    onSuccess: async () => {
      await invalidateUsers();
      await queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.users.all("admins"),
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (variables: ManagedUserStatusVariables) =>
      updateManagedUserStatus(variables),
    onSuccess: async () => {
      await invalidateUsers();
      await invalidateSessions();
    },
  });

  const roleMutation = useMutation({
    mutationFn: (variables: ManagedUserRoleVariables) =>
      updateManagedUserRole(variables),
    onSuccess: async () => {
      await invalidateUsers();
      await invalidateSessions();
    },
  });

  const detailsMutation = useMutation({
    mutationFn: (variables: ManagedUserDetailsVariables) =>
      updateManagedUserDetails(variables),
    onSuccess: invalidateUsers,
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => triggerManagedUserPasswordReset(userId),
  });

  const forcePasswordMutation = useMutation({
    mutationFn: (variables: ManagedUserForcePasswordVariables) =>
      updateManagedUserForcePasswordChange(variables),
    onSuccess: invalidateUsers,
  });

  const revokeSessionsMutation = useMutation({
    mutationFn: (userId: string) => revokeManagedUserSessions(userId),
    onSuccess: async () => {
      await invalidateSessions();
    },
  });

  return {
    ...usersQuery,
    createAdmin: createAdminMutation.mutateAsync,
    isCreatingAdmin: createAdminMutation.isPending,
    updateStatus: statusMutation.mutateAsync,
    isUpdatingStatus: statusMutation.isPending,
    updateRole: roleMutation.mutateAsync,
    isUpdatingRole: roleMutation.isPending,
    updateDetails: detailsMutation.mutateAsync,
    isUpdatingDetails: detailsMutation.isPending,
    triggerPasswordReset: resetMutation.mutateAsync,
    isTriggeringPasswordReset: resetMutation.isPending,
    updateForcePasswordChange: forcePasswordMutation.mutateAsync,
    isUpdatingForcePasswordChange: forcePasswordMutation.isPending,
    revokeSessions: revokeSessionsMutation.mutateAsync,
    isRevokingSessions: revokeSessionsMutation.isPending,
  };
}

export function useAdminSessions(
  page: number,
  limit: number,
  filters: AdminSessionsFilters,
) {
  const queryClient = useQueryClient();

  const queryKey = ADMIN_KEYS.sessions.list({
    page,
    limit,
    ...(filters.search && { search: filters.search }),
    ...(filters.userId && { userId: filters.userId }),
    ...(filters.role && { role: filters.role }),
    ...(filters.status && { status: filters.status }),
  });

  const sessionsQuery = useQuery<PaginatedResult<AdminSession>>({
    queryKey,
    queryFn: () => fetchAdminSessions(page, limit, filters),
    placeholderData: (prev) => prev,
  });

  const invalidateSessions = () =>
    queryClient.invalidateQueries({
      queryKey: ADMIN_KEYS.sessions.all(),
    });

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => revokeAdminSession(sessionId),
    onSuccess: invalidateSessions,
  });

  const revokeExpiredMutation = useMutation({
    mutationFn: revokeExpiredAdminSessions,
    onSuccess: invalidateSessions,
  });

  const revokeUserSessionsMutation = useMutation({
    mutationFn: (userId: string) => revokeManagedUserSessions(userId),
    onSuccess: invalidateSessions,
  });

  return {
    ...sessionsQuery,
    revokeSession: revokeSessionMutation.mutateAsync,
    isRevokingSession: revokeSessionMutation.isPending,
    revokeExpiredSessions: revokeExpiredMutation.mutateAsync,
    isRevokingExpiredSessions: revokeExpiredMutation.isPending,
    revokeUserSessions: revokeUserSessionsMutation.mutateAsync,
    isRevokingUserSessions: revokeUserSessionsMutation.isPending,
  };
}
