import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchAdminAmenities, createAmenity, updateAmenity } from "../api";

import type { Amenity } from "../types";

import type { PaginatedResult } from "@/common/types/pagination";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Filters = {
  search: string;
  isActive: "" | "true" | "false";
};

export function useAdminAmenities(
  page: number,
  limit: number,
  filters: Filters,
) {
  const queryClient = useQueryClient();

  /* ---------------- LIST ---------------- */

  const queryKey = ADMIN_KEYS.amenities.list({
    page,
    limit,
    ...(filters.search && { search: filters.search }),
    ...(filters.isActive && {
      isActive: filters.isActive === "true",
    }),
  });

  const listQuery = useQuery<PaginatedResult<Amenity>>({
    queryKey,
    queryFn: () =>
      fetchAdminAmenities(page, limit, {
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      }),
    placeholderData: (prev) => prev,
  });

  /* ---------------- CREATE ---------------- */

  const createMutation = useMutation({
    mutationFn: createAmenity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.amenities.all(),
      });
    },
  });

  /* ---------------- UPDATE ---------------- */

  const updateMutation = useMutation({
    mutationFn: updateAmenity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.amenities.all(),
      });
    },
  });

  return {
    ...listQuery,

    createAmenity: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    updateAmenity: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
