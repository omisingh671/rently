import { useQuery } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import {
  fetchDashboardContext,
  fetchDashboardSummary,
  fetchDashboardAnalytics,
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
