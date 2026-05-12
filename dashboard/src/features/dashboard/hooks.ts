import { useQuery } from "@tanstack/react-query";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import {
  fetchDashboardContext,
  fetchDashboardSummary,
  type DashboardContext,
  type DashboardSummary,
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
