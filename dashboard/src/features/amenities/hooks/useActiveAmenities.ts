import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import type { Amenity } from "../types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function useActiveAmenities() {
  return useQuery<Amenity[]>({
    queryKey: ADMIN_KEYS.amenities.active(),
    queryFn: async () => {
      const res = await axiosInstance.get<ApiResponse<{ items: Amenity[] }>>(
        API_ENDPOINTS.amenities.list,
        {
          params: {
            page: 1,
            limit: ADMIN_OPTION_LIST_LIMIT,
            isActive: true,
          },
        },
      );

      return res.data.data.items;
    },
    placeholderData: (prev) => prev,
  });
}
