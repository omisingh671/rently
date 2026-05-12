import axiosInstance from "@/api/axios";
import type {
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
} from "./types";

export const checkAvailability = async (
  payload: CheckAvailabilityPayload
): Promise<CheckAvailabilityResponse> => {
  const res = await axiosInstance.post("/public/availability/check", payload);
  return res.data?.data;
};
