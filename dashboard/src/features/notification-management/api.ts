import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type {
  NotificationAudit,
  NotificationChannel,
  NotificationDelivery,
  NotificationEventKey,
  NotificationOverrideState,
  NotificationSettingsResponse,
} from "./types";

export const getNotificationSettingsApi = async (propertyId?: string) => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<NotificationSettingsResponse>>(
    API_ENDPOINTS.notifications.settings,
    { params: propertyId ? { propertyId } : undefined },
  );
  return data.data;
};

export const updateGlobalNotificationSettingApi = async (input: {
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  enabled: boolean;
}) => {
  await axiosInstance.patch(API_ENDPOINTS.notifications.globalSetting, input);
};

export const updatePropertyNotificationOverrideApi = async (input: {
  propertyId: string;
  eventKey: NotificationEventKey;
  channel: NotificationChannel;
  state: NotificationOverrideState;
}) => {
  const { propertyId, ...payload } = input;
  await axiosInstance.patch(API_ENDPOINTS.notifications.propertyOverride(propertyId), payload);
};

export const getNotificationAuditsApi = async () => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<NotificationAudit[]>>(
    API_ENDPOINTS.notifications.audits,
  );
  return data.data;
};

export const getNotificationDeliveriesApi = async () => {
  const { data } = await axiosInstance.get<ApiSuccessResponse<NotificationDelivery[]>>(
    API_ENDPOINTS.notifications.deliveries,
  );
  return data.data;
};

export const retryNotificationDeliveryApi = async (deliveryId: string) => {
  await axiosInstance.post(API_ENDPOINTS.notifications.retryDelivery(deliveryId));
};
