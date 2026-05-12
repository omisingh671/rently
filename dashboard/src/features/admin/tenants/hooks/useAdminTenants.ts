import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import type { PaginatedResult } from "@/common/types/pagination";
import {
  createTenant,
  fetchActiveTenants,
  fetchAdminTenants,
  updateTenant,
} from "../api";
import type { AdminTenant, TenantStatus } from "../types";

type Filters = {
  search: string;
  status: TenantStatus | "";
};

export function useAdminTenants(page: number, limit: number, filters: Filters) {
  const queryClient = useQueryClient();

  const listQuery = useQuery<PaginatedResult<AdminTenant>>({
    queryKey: ADMIN_KEYS.tenants.list({
      page,
      limit,
      ...(filters.search && { search: filters.search }),
      ...(filters.status && { status: filters.status }),
    }),
    queryFn: () =>
      fetchAdminTenants(page, limit, {
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
      }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants.all() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants.all() });
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.properties.all() });
    },
  });

  return {
    ...listQuery,
    createTenant: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateTenant: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}

export function useActiveTenants() {
  return useQuery<AdminTenant[]>({
    queryKey: ADMIN_KEYS.tenants.options(),
    queryFn: fetchActiveTenants,
  });
}
