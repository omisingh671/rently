import axiosInstance from "@/api/axios";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import type { UserRole } from "@/configs/appConfig";
import type { ApiSuccessResponse } from "@/common/types/api";

export type DashboardContext = {
  user: {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
  };
  properties: Array<{
    id: string;
    name: string;
    city: string;
    state: string;
  }>;
  modules: string[];
};

export type DashboardSummary = {
  totalProperties: number;
  totalAdmins: number;
  totalManagers: number;
  totalAmenities: number;
  totalUnits: number;
  totalRooms: number;
  totalMaintenanceBlocks: number;
  totalRoomProducts: number;
  totalRoomPricing: number;
  totalTaxes: number;
  totalCoupons: number;
  totalBookings: number;
  pendingBookings: number;
  totalEnquiries: number;
  openEnquiries: number;
  totalQuotes: number;
  openQuotes: number;
  totalAssignments: number;
};

export const fetchDashboardContext = async (): Promise<DashboardContext> => {
  const res = await axiosInstance.get<ApiSuccessResponse<DashboardContext>>(
    API_ENDPOINTS.dashboard.me,
  );

  return res.data.data;
};

export const fetchDashboardSummary = async (): Promise<DashboardSummary> => {
  const res = await axiosInstance.get<ApiSuccessResponse<DashboardSummary>>(
    API_ENDPOINTS.dashboard.summary,
  );

  return res.data.data;
};
