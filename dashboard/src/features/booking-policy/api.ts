import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  BookingPolicy,
  BookingPolicyAudit,
  BookingPolicyPayload,
} from "./types";

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

export const getBookingPolicyAuditsApi = async (
  propertyId: string,
): Promise<BookingPolicyAudit[]> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<BookingPolicyAudit[]>>(
    API_ENDPOINTS.bookingPolicy.audits(propertyId),
  );
  return data.data;
};
