import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { AdminProperty } from "../types";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

export const useActiveProperties = () => {
  return useQuery<AdminProperty[]>({
    queryKey: [...ADMIN_KEYS.properties.all(), "active-options"],
    queryFn: async () => {
      const res = await axiosInstance.get(API_ENDPOINTS.properties.list, {
        params: { isActive: true, page: 1, limit: ADMIN_OPTION_LIST_LIMIT },
      });

      return res.data.data.items;
    },
    staleTime: 5 * 60 * 1000,
  });
};
