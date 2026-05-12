import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { ApiSuccessResponse } from "@/common/types/api";
import type {
  AdminRoom,
  CreateRoomPayload,
  PaginatedRoomsResponse,
  UpdateRoomPayload,
} from "./types";

type RoomListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  isActive?: boolean;
};

const stripPropertyId = <T extends { propertyId?: string }>(
  payload: T,
): Omit<T, "propertyId"> => {
  const body = { ...payload };
  delete body.propertyId;
  return body;
};

export const listRoomsApi = async (
  propertyId: string,
  params: RoomListParams,
): Promise<PaginatedRoomsResponse> => {
  const { data } = await axiosInstance.get<
    ApiSuccessResponse<PaginatedRoomsResponse>
  >(API_ENDPOINTS.rooms.byProperty(propertyId), { params });

  return data.data;
};

export const getRoomByIdApi = async (roomId: string): Promise<AdminRoom> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<AdminRoom>>(
    API_ENDPOINTS.rooms.byId(roomId),
  );

  return data.data;
};

export const createRoomApi = async (
  payload: CreateRoomPayload,
): Promise<AdminRoom> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<AdminRoom>>(
    API_ENDPOINTS.rooms.byProperty(payload.propertyId),
    stripPropertyId(payload),
  );

  return data.data;
};

export const updateRoomApi = async (
  roomId: string,
  payload: UpdateRoomPayload,
): Promise<AdminRoom> => {
  const { data } = await axiosInstance.patch<ApiSuccessResponse<AdminRoom>>(
    API_ENDPOINTS.rooms.byId(roomId),
    stripPropertyId(payload),
  );

  return data.data;
};

export const deleteRoomApi = async (roomId: string): Promise<void> => {
  await axiosInstance.delete(API_ENDPOINTS.rooms.byId(roomId));
};
