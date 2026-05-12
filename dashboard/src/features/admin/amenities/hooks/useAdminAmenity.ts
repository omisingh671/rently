import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAmenityById, updateAmenity } from "../api";

import type { Amenity, UpdateAmenityPayload } from "../types";

const LIST_QUERY_KEY = ["admin", "amenities"] as const;

export function useAdminAmenity(amenityId: string) {
  const queryClient = useQueryClient();

  /* ---------------- READ ---------------- */
  const amenityQuery = useQuery<Amenity>({
    queryKey: ["admin", "amenity", amenityId],
    queryFn: () => fetchAmenityById(amenityId),
    enabled: !!amenityId,
  });

  /* ---------------- FULL UPDATE ---------------- */
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateAmenityPayload) =>
      updateAmenity({ amenityId, payload }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "amenity", amenityId],
      });

      queryClient.invalidateQueries({
        queryKey: LIST_QUERY_KEY,
      });
    },
  });

  return {
    ...amenityQuery,
    updateAmenity: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
