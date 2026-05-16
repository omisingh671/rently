import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  listUnitsApi,
  createUnitApi,
  updateUnitApi,
  deleteUnitApi,
} from "../api";

import type {
  CreateUnitPayload,
  UpdateUnitPayload,
  AdminUnit,
  UnitStatus,
} from "../types";

import type { PaginatedResult } from "@/common/types/pagination";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Filters = {
  search: string;
  status: UnitStatus | "";
  isActive: "" | "true" | "false";
};

export const useAdminUnits = (
  propertyId: string | undefined,
  page: number,
  limit: number,
  filters: Filters,
) => {
  const queryClient = useQueryClient();

  /* ---------------- LIST ---------------- */

  const queryKey = propertyId
    ? ADMIN_KEYS.units.list({
        propertyId,
        page,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      })
    : ADMIN_KEYS.units.all();

  const query = useQuery<PaginatedResult<AdminUnit>>({
    queryKey,
    queryFn: async () => {
      if (!propertyId) {
        throw new Error("PropertyId required");
      }

      return listUnitsApi(propertyId, {
        page,
        limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        isActive:
          filters.isActive === "" ? undefined : filters.isActive === "true",
      });
    },
    enabled: !!propertyId,
    placeholderData: (prev) => prev,
  });

  /* ---------------- CREATE ---------------- */

  const createMutation = useMutation({
    mutationFn: async (payload: CreateUnitPayload) => {
      if (!propertyId) throw new Error("PropertyId required");
      return createUnitApi(propertyId, payload);
    },
    onSuccess: () => {
      if (!propertyId) return;
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.units.byProperty(propertyId),
      });
    },
  });

  /* ---------------- UPDATE ---------------- */

  const updateMutation = useMutation({
    mutationFn: ({
      unitId,
      payload,
    }: {
      unitId: string;
      payload: UpdateUnitPayload;
    }) => updateUnitApi(unitId, payload),
    onSuccess: () => {
      if (!propertyId) return;
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.units.byProperty(propertyId),
      });
    },
  });

  /* ---------------- DELETE ---------------- */

  const deleteMutation = useMutation({
    mutationFn: deleteUnitApi,
    onSuccess: () => {
      if (!propertyId) return;
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.units.byProperty(propertyId),
      });
    },
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,

    createUnit: createMutation.mutateAsync,
    updateUnit: updateMutation.mutateAsync,
    deleteUnit: deleteMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
