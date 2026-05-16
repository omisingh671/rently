import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchAdminProperties, createProperty, updateProperty } from "../api";

import type { PropertyStatus, AdminProperty } from "../types";

import type { PaginatedResult } from "@/common/types/pagination";

import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Filters = {
  search: string;
  status: PropertyStatus | "";
  isActive: "" | "true" | "false";
};

export function useAdminProperties(
  page: number,
  limit: number,
  filters: Filters,
) {
  const queryClient = useQueryClient();

  /* ---------------- LIST ---------------- */

  const queryKey = ADMIN_KEYS.properties.list({
    page,
    limit,
    ...(filters.search && { search: filters.search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.isActive && {
      isActive: filters.isActive === "true",
    }),
  });

  const listQuery = useQuery<PaginatedResult<AdminProperty>>({
    queryKey,
    queryFn: () =>
      fetchAdminProperties(page, limit, {
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      }),
    placeholderData: (prev) => prev,
  });

  /* ---------------- CREATE ---------------- */

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.properties.all(),
      });
    },
  });

  /* ---------------- UPDATE ---------------- */

  const updateMutation = useMutation({
    mutationFn: updateProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.properties.all(),
      });
    },
  });

  return {
    ...listQuery,

    /* create */
    createProperty: createMutation.mutate,
    isCreating: createMutation.isPending,

    /* update */
    updateProperty: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
