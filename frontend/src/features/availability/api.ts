import axiosInstance from "@/api/axios";
import type {
  CheckAvailabilityPayload,
  CheckAvailabilityResponse,
  CalendarAvailabilityPayload,
  CalendarAvailabilityResponse,
} from "./types";

export const checkAvailability = async (
  payload: CheckAvailabilityPayload
): Promise<CheckAvailabilityResponse> => {
  const res = await axiosInstance.post("/public/availability/check", payload);
  return res.data?.data;
};

export const getCalendarAvailability = async (
  payload: CalendarAvailabilityPayload,
): Promise<CalendarAvailabilityResponse> => {
  const res = await axiosInstance.post("/public/availability/calendar", payload);
  return res.data?.data;
};
