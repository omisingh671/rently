import axiosInstance from "@/api/axios";
import type { ApiSuccessResponse } from "@/common/types/api";
import type { UserRole } from "@/configs/appConfig";
import { API_ENDPOINTS } from "@/configs/apiEndpoints";

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

export type DailyOccupancy = {
  date: string;
  totalRooms: number;
  availableNights: number;
  occupiedNights: number;
  occupancyRate: number;
};

export type DailyRevenue = {
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  refunds: number;
  netRevenue: number;
};

export type BookingSource = {
  source: "PUBLIC" | "WALK_IN";
  count: number;
  revenue: number;
};

export type EnquiryConversion = {
  totalEnquiries: number;
  convertedEnquiries: number;
  enquiryConversionRate: number;
  totalQuotes: number;
  convertedQuotes: number;
  quoteConversionRate: number;
  totalBookings: number;
};

export type PropertyPerformance = {
  propertyId: string;
  propertyName: string;
  occupancyRate: number;
  totalRooms: number;
  availableNights: number;
  occupiedNights: number;
  grossRevenue: number;
  netRevenue: number;
  adr: number;
  revpar: number;
};

export type ManagerActivity = {
  managerId: string;
  managerName: string;
  email: string;
  role: string;
  walkinsCreated: number;
  checkInsProcessed: number;
  checkOutsProcessed: number;
  paymentsRecorded: number;
};

export type ReportingAnalytics = {
  occupancy: DailyOccupancy[];
  revenue: DailyRevenue[];
  sources: BookingSource[];
  conversions: EnquiryConversion;
  properties: PropertyPerformance[];
  managers: ManagerActivity[];
};

export type PropertyDailyClose = {
  id: string;
  propertyId: string;
  businessDate: string;
  closedByUserId: string;
  closedByName: string;
  paymentCount: number;
  paymentTotal: number;
  refundCount: number;
  refundTotal: number;
  netPaymentTotal: number;
  bookingsCreated: number;
  checkIns: number;
  checkOuts: number;
  noShows: number;
  note: string | null;
  closedAt: string;
};

export const fetchPropertyDailyCloses = async (params: {
  propertyId: string;
  startDate: string;
  endDate: string;
}): Promise<PropertyDailyClose[]> => {
  const res = await axiosInstance.get<ApiSuccessResponse<PropertyDailyClose[]>>(
    API_ENDPOINTS.dashboard.dailyCloses(params.propertyId),
    { params: { startDate: params.startDate, endDate: params.endDate } },
  );
  return res.data.data;
};

export const closePropertyBusinessDate = async (input: {
  propertyId: string;
  businessDate: string;
  note?: string;
}): Promise<PropertyDailyClose> => {
  const res = await axiosInstance.post<ApiSuccessResponse<PropertyDailyClose>>(
    API_ENDPOINTS.dashboard.dailyCloses(input.propertyId),
    {
      businessDate: input.businessDate,
      ...(input.note !== undefined && { note: input.note }),
    },
  );
  return res.data.data;
};

export const fetchDashboardAnalytics = async (params: {
  startDate: string;
  endDate: string;
  propertyId?: string;
}): Promise<ReportingAnalytics> => {
  const res = await axiosInstance.get<ApiSuccessResponse<ReportingAnalytics>>(
    API_ENDPOINTS.dashboard.analytics,
    { params },
  );
  return res.data.data;
};

