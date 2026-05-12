/**
 * - useCheckAvailability: queries the list of spaces for availability check
 **/

import { useMutation } from "@tanstack/react-query";
import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import * as api from "./api";
import type {
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
} from "./types";

export const useCheckAvailability = () => {
  return useMutation<
    CheckAvailabilityResponse,
    Error,
    CheckAvailabilityPayload
  >({
    mutationKey: PUBLIC_QUERY_KEYS.availability.check,
    mutationFn: async (payload) => api.checkAvailability(payload),
    retry: false,
  });
};
