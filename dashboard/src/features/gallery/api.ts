import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { ApiSuccessResponse } from "@/common/types/api";
import type { GalleryItem, CreateGalleryPayload } from "./types";

export const fetchGalleries = async (filters: {
  propertyId?: string;
  unitId?: string;
  roomId?: string;
}): Promise<GalleryItem[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<GalleryItem[]>>(
    API_ENDPOINTS.galleries.list,
    {
      params: filters,
    },
  );
  return res.data.data;
};

export const createGallery = async (
  payload: CreateGalleryPayload,
): Promise<GalleryItem> => {
  const formData = new FormData();
  formData.append("propertyId", payload.propertyId);
  if (payload.unitId) {
    formData.append("unitId", payload.unitId);
  }
  if (payload.roomId) {
    formData.append("roomId", payload.roomId);
  }
  formData.append("image", payload.file);

  const res = await axiosInstance.post<ApiSuccessResponse<GalleryItem>>(
    API_ENDPOINTS.galleries.create,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return res.data.data;
};

export const deleteGallery = async (galleryId: string): Promise<void> => {
  await axiosInstance.delete<ApiSuccessResponse<void>>(
    API_ENDPOINTS.galleries.deleteById(galleryId),
  );
};
