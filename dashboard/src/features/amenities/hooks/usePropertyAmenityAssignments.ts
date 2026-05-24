import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPropertyAmenityAssignments,
  replacePropertyAmenityAssignments,
} from "../api";
import type { PropertyAmenityAssignments } from "../types";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

export function usePropertyAmenityAssignments(propertyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery<PropertyAmenityAssignments>({
    queryKey: ADMIN_KEYS.amenities.assignments(propertyId),
    queryFn: () => fetchPropertyAmenityAssignments(propertyId),
    enabled: !!propertyId,
  });

  const mutation = useMutation({
    mutationFn: (payload: PropertyAmenityAssignments) =>
      replacePropertyAmenityAssignments(propertyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.amenities.assignments(propertyId),
      });
    },
  });

  return {
    ...query,
    saveAssignments: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
