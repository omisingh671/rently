import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import type { PaginatedResult } from "@/common/types/pagination";
import {
  createRoomApi,
  deleteRoomApi,
  listRoomsApi,
  updateRoomApi,
} from "../api";
import type {
  AdminRoom,
  RoomStatus,
  UpdateRoomPayload,
} from "../types";

type Filters = {
  search: string;
  status: RoomStatus | "";
  isActive: "" | "true" | "false";
};

export const useAdminRooms = (
  propertyId: string | undefined,
  page: number,
  limit: number,
  filters: Filters,
) => {
  const queryClient = useQueryClient();

  const queryKey = propertyId
    ? ADMIN_KEYS.rooms.list({
        propertyId,
        page,
        limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isActive && {
          isActive: filters.isActive === "true",
        }),
      })
    : ADMIN_KEYS.rooms.all();

  const query = useQuery<PaginatedResult<AdminRoom>>({
    queryKey,
    queryFn: async () => {
      if (!propertyId) {
        throw new Error("PropertyId required");
      }

      return listRoomsApi(propertyId, {
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

  const createMutation = useMutation({
    mutationFn: createRoomApi,
    onSuccess: (room) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.rooms.byProperty(room.propertyId),
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      roomId,
      payload,
    }: {
      roomId: string;
      payload: UpdateRoomPayload;
    }) => updateRoomApi(roomId, payload),
    onSuccess: (room) => {
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.rooms.byProperty(room.propertyId),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoomApi,
    onSuccess: () => {
      if (!propertyId) return;
      queryClient.invalidateQueries({
        queryKey: ADMIN_KEYS.rooms.byProperty(propertyId),
      });
    },
  });

  return {
    data: query.data,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    createRoom: createMutation.mutateAsync,
    updateRoom: updateMutation.mutateAsync,
    deleteRoom: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
