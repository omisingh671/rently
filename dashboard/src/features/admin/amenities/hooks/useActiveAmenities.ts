import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";

interface Amenity {
  id: string;
  name: string;
  icon: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export function useActiveAmenities(propertyId?: string) {
  return useQuery<Amenity[]>({
    queryKey: ["admin", "amenities", "active", propertyId],
    queryFn: async () => {
      if (!propertyId) {
        return [];
      }

      const res = await axiosInstance.get<ApiResponse<{ items: Amenity[] }>>(
        API_ENDPOINTS.amenities.byProperty(propertyId),
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
    enabled: Boolean(propertyId),
    placeholderData: (prev) => prev,
  });
}
