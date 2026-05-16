import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { createUser, fetchAdminUsers, updateUser } from "../api";

import type {
  AdminUser,
  AdminUserScope,
  CreateUserPayload,
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
