import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchAdminAmenities, createAmenity, updateAmenity } from "../api";

import type { Amenity, CreateAmenityPayload } from "../types";

import type { PaginatedResult } from "@/common/types/pagination";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Filters = {
  search: string;
  isActive: "" | "true" | "false";
};

export function useAdminAmenities(
  propertyId: string | undefined,
  page: number,
  limit: number,
  filters: Filters,
) {
  const queryClient = useQueryClient();

  /* ---------------- LIST ---------------- */

  const queryKey = propertyId
    ? ADMIN_KEYS.amenities.list({
        propertyId,
        page,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      })
    : ADMIN_KEYS.amenities.all();

  const listQuery = useQuery<PaginatedResult<Amenity>>({
    queryKey,
    queryFn: () =>
      fetchAdminAmenities(propertyId ?? "", page, limit, {
        ...(filters.search && { search: filters.search }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      }),
    enabled: Boolean(propertyId),
    placeholderData: (prev) => prev,
  });

  /* ---------------- CREATE ---------------- */

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAmenityPayload) => {
      if (!propertyId) {
        throw new Error("PropertyId required");
      }

      return createAmenity(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: propertyId
          ? ADMIN_KEYS.amenities.byProperty(propertyId)
          : ADMIN_KEYS.amenities.all(),
      });
    },
  });

  /* ---------------- UPDATE ---------------- */

  const updateMutation = useMutation({
    mutationFn: updateAmenity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: propertyId
          ? ADMIN_KEYS.amenities.byProperty(propertyId)
          : ADMIN_KEYS.amenities.all(),
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
