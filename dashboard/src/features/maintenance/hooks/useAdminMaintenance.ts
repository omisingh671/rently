import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import type { PaginatedResult } from "@/common/types/pagination";
import {
  createMaintenanceApi,
  deleteMaintenanceApi,
  listMaintenanceApi,
  updateMaintenanceApi,
} from "../api";
import type {
  AdminMaintenanceBlock,
  MaintenanceTargetType,
  UpdateMaintenancePayload,
} from "../types";

type Filters = {
  search: string;
  targetType: MaintenanceTargetType | "";
};

export const useAdminMaintenance = (
  propertyId: string | undefined,
  page: number,
  limit: number,
  filters: Filters,
) => {
  const queryClient = useQueryClient();

  const queryKey = propertyId
    ? ADMIN_KEYS.maintenance.list({
        propertyId,
        page,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.targetType && { targetType: filters.targetType }),
      })
    : ADMIN_KEYS.maintenance.all();

  const query = useQuery<PaginatedResult<AdminMaintenanceBlock>>({
    queryKey,
    queryFn: async () => {
      if (!propertyId) {
        throw new Error("PropertyId required");
      }

      return listMaintenanceApi(propertyId, {
        page,
        limit,
        search: filters.search || undefined,
        targetType: filters.targetType || undefined,
      });
    },
    enabled: !!propertyId,
    placeholderData: (prev) => prev,
  });

  const createMutation = useMutation({
    mutationFn: createMaintenanceApi,
    onSuccess: (block) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.maintenance.byProperty(block.propertyId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      maintenanceId,
      payload,
    }: {
      maintenanceId: string;
      payload: UpdateMaintenancePayload;
    }) => updateMaintenanceApi(maintenanceId, payload),
    onSuccess: (block) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.maintenance.byProperty(block.propertyId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMaintenanceApi,
    onSuccess: () => {
      if (!propertyId) return;
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.maintenance.byProperty(propertyId),
      });
    },
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    createMaintenance: createMutation.mutateAsync,
    updateMaintenance: updateMutation.mutateAsync,
    deleteMaintenance: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
