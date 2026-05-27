import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { BookingPolicy, BookingPolicyPayload } from "./types";

export const getBookingPolicyApi = async (
  propertyId: string,
): Promise<BookingPolicy> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<BookingPolicy>>(
    API_ENDPOINTS.bookingPolicy.byProperty(propertyId),
  );
  return data.data;
};

export const updateBookingPolicyApi = async (
  propertyId: string,
  payload: BookingPolicyPayload,
): Promise<BookingPolicy> => {
  const { data } = await axiosInstance.put<ApiSuccessResponse<BookingPolicy>>(
    API_ENDPOINTS.bookingPolicy.byProperty(propertyId),
    payload,
  );
  return data.data;
};
