import type { UserRole } from "@/generated/prisma/enums.js";

export interface ReportingUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdByUserId: string | null;
  countryCode: string | null;
  contactNumber: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportingPropertySummaryDTO {
  id: string;
  name: string;
  city: string;
  state: string;
  tenantId: string;
  tenantName: string;
}

export interface ReportingMeDTO {
  user: ReportingUserDTO;
  properties: ReportingPropertySummaryDTO[];
  modules: string[];
}

export interface ReportingSummaryDTO {
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
}

export interface DailyOccupancyDTO {
  date: string;
  totalRooms: number;
  availableNights: number;
  occupiedNights: number;
  occupancyRate: number;
}

export interface DailyRevenueDTO {
  date: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  refunds: number;
  netRevenue: number;
}

export interface BookingSourceDTO {
  source: "PUBLIC" | "WALK_IN";
  count: number;
  revenue: number;
}

export interface EnquiryConversionDTO {
  totalEnquiries: number;
  convertedEnquiries: number;
  enquiryConversionRate: number;
  totalQuotes: number;
  convertedQuotes: number;
  quoteConversionRate: number;
  totalBookings: number;
}

export interface PropertyPerformanceDTO {
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
}

export interface ManagerActivityDTO {
  managerId: string;
  managerName: string;
  email: string;
  role: string;
  walkinsCreated: number;
  checkInsProcessed: number;
  checkOutsProcessed: number;
  paymentsRecorded: number;
}

export interface ReportingAnalyticsDTO {
  occupancy: DailyOccupancyDTO[];
  revenue: DailyRevenueDTO[];
  sources: BookingSourceDTO[];
  conversions: {
    totalEnquiries: number;
    convertedEnquiries: number;
    enquiryConversionRate: number;
    totalQuotes: number;
    convertedQuotes: number;
    quoteConversionRate: number;
    totalBookings: number;
  };
  properties: PropertyPerformanceDTO[];
  managers: ManagerActivityDTO[];
}
