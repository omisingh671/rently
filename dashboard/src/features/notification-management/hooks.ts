import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  getNotificationAuditsApi,
  getNotificationDeliveriesApi,
  getNotificationSettingsApi,
  retryNotificationDeliveryApi,
  updateGlobalNotificationSettingApi,
  updatePropertyNotificationOverrideApi,
} from "./api";

export const useNotificationManagement = (propertyId?: string) => {
  const queryClient = useQueryClient();
  const settings = useQuery({
    queryKey: ADMIN_KEYS.notifications.settings(propertyId),
    queryFn: () => getNotificationSettingsApi(propertyId),
  });
  const audits = useQuery({
    queryKey: ADMIN_KEYS.notifications.audits(),
    queryFn: getNotificationAuditsApi,
  });
  const deliveries = useQuery({
    queryKey: ADMIN_KEYS.notifications.deliveries(),
    queryFn: getNotificationDeliveriesApi,
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.notifications.all() }),
    ]);
  };
  const globalMutation = useMutation({ mutationFn: updateGlobalNotificationSettingApi, onSuccess: invalidate });
  const overrideMutation = useMutation({ mutationFn: updatePropertyNotificationOverrideApi, onSuccess: invalidate });
  const retryMutation = useMutation({ mutationFn: retryNotificationDeliveryApi, onSuccess: invalidate });

  return { settings, audits, deliveries, globalMutation, overrideMutation, retryMutation };
};
