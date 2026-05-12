import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createPropertyAssignment,
  deletePropertyAssignment,
  fetchPropertyAssignments,
} from "../api";
import type {
  AdminPropertyAssignment,
  CreatePropertyAssignmentPayload,
  PropertyAssignmentRole,
} from "../types";
import type { PaginatedResult } from "@/common/types/pagination";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";

type Filters = {
  propertyId?: string;
  role?: PropertyAssignmentRole;
};

export const usePropertyAssignments = (
  page: number,
  limit: number,
  filters: Filters,
) => {
  const queryClient = useQueryClient();

  const query = useQuery<PaginatedResult<AdminPropertyAssignment>>({
    queryKey: ADMIN_KEYS.assignments.list({
      page,
      limit,
      ...(filters.propertyId && { propertyId: filters.propertyId }),
      ...(filters.role && { role: filters.role }),
    }),
    queryFn: () =>
      fetchPropertyAssignments(page, limit, {
        ...(filters.propertyId && { propertyId: filters.propertyId }),
        ...(filters.role && { role: filters.role }),
      }),
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePropertyAssignmentPayload) =>
      createPropertyAssignment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.assignments.all(),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePropertyAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.assignments.all(),
      });
    },
  });

  return {
    ...query,
    createAssignment: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    deleteAssignment: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
};
