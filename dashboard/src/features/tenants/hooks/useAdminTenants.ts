import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import type { PaginatedResult } from "@/common/types/pagination";
import {
  createTenant,
  fetchActiveTenants,
  fetchAdminTenants,
  updateTenant,
  uploadTenantLogo,
  removeTenantLogo,
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

  const uploadLogoMutation = useMutation({
    mutationFn: ({ tenantId, file }: { tenantId: string; file: File }) =>
      uploadTenantLogo(tenantId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants.all() });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: removeTenantLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.tenants.all() });
    },
  });

  return {
    ...listQuery,
    createTenant: createMutation.mutate,
    createTenantAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateTenant: updateMutation.mutate,
    updateTenantAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    uploadTenantLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,
    removeTenantLogo: removeLogoMutation.mutateAsync,
    isRemovingLogo: removeLogoMutation.isPending,
  };
}

export function useActiveTenants() {
  return useQuery<AdminTenant[]>({
    queryKey: ADMIN_KEYS.tenants.options(),
    queryFn: fetchActiveTenants,
  });
}
