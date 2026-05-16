import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPropertyById, updateProperty } from "../api";
import type { AdminProperty, UpdatePropertyPayload } from "../types";

const LIST_QUERY_KEY = ["admin", "properties"] as const;

export function useAdminProperty(propertyId: string) {
  const queryClient = useQueryClient();

  /* ---------------- READ ---------------- */
  const propertyQuery = useQuery<AdminProperty>({
    queryKey: ["admin", "property", propertyId],
    queryFn: () => fetchPropertyById(propertyId),
    enabled: !!propertyId,
  });

  /* ---------------- FULL UPDATE ---------------- */
  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePropertyPayload) =>
      updateProperty({ propertyId, payload }),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "property", propertyId],
      });
      queryClient.invalidateQueries({
        queryKey: LIST_QUERY_KEY,
      });
    },
  });

  return {
    ...propertyQuery,
    updateProperty: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
