import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { EmailDeliveryJob } from "./types";

export const listEmailDeliveryJobsApi = async (): Promise<EmailDeliveryJob[]> => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<EmailDeliveryJob[]>>(
    API_ENDPOINTS.emailDeliveries.list,
  );
  return data.data;
};

export const retryEmailDeliveryJobApi = async (
  deliveryId: string,
): Promise<EmailDeliveryJob> => {
  const { data } = await axiosInstance.post<ApiSuccessResponse<EmailDeliveryJob>>(
    API_ENDPOINTS.emailDeliveries.retry(deliveryId),
  );
  return data.data;
};
