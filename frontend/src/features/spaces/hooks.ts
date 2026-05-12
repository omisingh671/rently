/**
 * - useSpaces: queries the list of spaces
 * - useSpace: queries a single space by id
 **/

import { useQuery } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import * as api from "./api";
import type { Space } from "./types";

export const useSpaces = (enabled = true) => {
  return useQuery<Space[], Error>({
    queryKey: PUBLIC_QUERY_KEYS.spaces.all,
    queryFn: async () => {
      return api.listSpaces();
    },
    enabled,
    retry: false,
  });
};

export const useSpace = (id?: string, enabled = true) => {
  return useQuery<Space, Error>({
    queryKey: id
      ? PUBLIC_QUERY_KEYS.spaces.detail(id)
      : PUBLIC_QUERY_KEYS.spaces.detail(""),
    queryFn: async () => {
      if (!id) throw new Error("Missing space id");
      return api.getSpace(id);
    },
    enabled: Boolean(id) && enabled,
    retry: false,
  });
};
