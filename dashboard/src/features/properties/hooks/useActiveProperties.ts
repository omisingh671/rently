import { useQuery } from "@tanstack/react-query";
import type { AdminProperty } from "../types";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { fetchAdminProperties, fetchPropertyById } from "../api";

export const useActiveProperties = (selectedPropertyId?: string | null) => {
  return useQuery<AdminProperty[]>({
    queryKey: [
      ...ADMIN_KEYS.properties.all(),
      "active-options",
      selectedPropertyId ?? null,
    ],
    queryFn: async () => {
      const result = await fetchAdminProperties(1, 25, { isActive: true });
      if (
        !selectedPropertyId ||
        result.items.some((property) => property.id === selectedPropertyId)
      ) {
        return result.items;
      }
      try {
        const selected = await fetchPropertyById(selectedPropertyId);
        return selected.isActive ? [selected, ...result.items] : result.items;
      } catch {
        return result.items;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
};
