import { useQuery } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import { getPublicTenantConfig } from "./api";
import type { PublicTenantConfig } from "./types";

export const usePublicTenantConfig = () =>
  useQuery<PublicTenantConfig, Error>({
    queryKey: PUBLIC_QUERY_KEYS.config,
    queryFn: getPublicTenantConfig,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
