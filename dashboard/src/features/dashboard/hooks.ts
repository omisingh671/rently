import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  fetchDashboardContext,
  fetchDashboardSummary,
  fetchDashboardAnalytics,
  fetchPropertyDailyCloses,
  closePropertyBusinessDate,
  type DashboardContext,
  type DashboardSummary,
  type ReportingAnalytics,
} from "./api";

export const useDashboardContext = () =>
  useQuery<DashboardContext>({
    queryKey: ADMIN_KEYS.dashboard.me(),
    queryFn: fetchDashboardContext,
  });

export const useDashboardSummary = () =>
  useQuery<DashboardSummary>({
    queryKey: ADMIN_KEYS.dashboard.summary(),
    queryFn: fetchDashboardSummary,
  });

export const useDashboardAnalytics = (params: {
  startDate: string;
  endDate: string;
  propertyId?: string;
}) =>
  useQuery<ReportingAnalytics>({
    queryKey: ADMIN_KEYS.dashboard.analytics(params),
    queryFn: () => fetchDashboardAnalytics(params),
    enabled: Boolean(params.startDate && params.endDate),
  });

export const usePropertyDailyCloses = (params: {
  propertyId: string;
  startDate: string;
  endDate: string;
}) =>
  useQuery({
    queryKey: ADMIN_KEYS.dashboard.dailyCloses(params),
    queryFn: () => fetchPropertyDailyCloses(params),
    enabled: Boolean(params.propertyId && params.startDate && params.endDate),
  });

export const useClosePropertyBusinessDate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closePropertyBusinessDate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [...ADMIN_KEYS.root, "dashboard", "daily-closes"],
      });
    },
  });
};
