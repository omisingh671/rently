import type {
  BookingStatus,
  BookingTargetType,
  DiscountType,
  LeadStatus,
  MaintenanceTargetType,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  TenantStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TaxType,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/enums.js";

export interface DashboardUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  createdByUserId: string | null;
  countryCode: string | null;
  contactNumber: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPropertySummaryDTO {
  id: string;
  name: string;
  city: string;
  state: string;
  tenantId: string;
  tenantName: string;
}

export interface DashboardTenantDTO {
  id: string;
  name: string;
  slug: string;
  primaryDomain: string | null;
  status: TenantStatus;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCurrency: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardPropertyDTO {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status: PropertyStatus;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  adminAssignment:
    | {
        userId: string;
        fullName: string;
        email: string;
      }
    | null;
}

export interface DashboardPropertyAssignmentDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: PropertyAssignmentRole;
  assignedByUserId: string;
  assignedByName: string;
  createdAt: Date;
}

export interface DashboardAmenityDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  icon: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface DashboardUnitDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;
  amenityIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardRoomDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  unitId: string;
  unitNumber: string;
  name: string;
  number: string;
  rent: number;
  hasAC: boolean;
  maxOccupancy: number;
  status: RoomStatus;
  isActive: boolean;
  amenityIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardMaintenanceBlockDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  targetType: MaintenanceTargetType;
  unitId: string | null;
  unitNumber: string | null;
  roomId: string | null;
  roomLabel: string | null;
  reason: string | null;
  startDate: Date;
  endDate: Date;
  createdByUserId: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardRoomProductDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardRoomPricingDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  roomId: string | null;
  roomLabel: string | null;
  unitId: string | null;
  unitNumber: string | null;
  productId: string;
  productName: string;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights: number | null;
  taxInclusive: boolean;
  price: string;
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;
}

export interface DashboardTaxDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  rate: string;
  taxType: TaxType;
  appliesTo: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardCouponDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: number | null;
  usedCount: number;
  minNights: number | null;
  minAmount: string | null;
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardBookingDTO {
  id: string;
  bookingRef: string;
  propertyId: string;
  propertyName: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  guestNameSnapshot: string;
  guestEmailSnapshot: string;
  guestContactSnapshot: string | null;
  productId: string | null;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  targetLabel: string;
  productName: string;
  pricePerNight: string;
  checkIn: Date;
  checkOut: Date;
  status: BookingStatus;
  totalAmount: string;
  internalNotes: string | null;
  statusHistory: Array<{
    id: string;
    fromStatus: BookingStatus | null;
    toStatus: BookingStatus;
    actorUserId: string | null;
    actorName: string | null;
    note: string | null;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardEnquiryDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardQuoteDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  userId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  productId: string | null;
  productName: string | null;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  checkIn: Date;
  checkOut: Date;
  status: LeadStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardMeDTO {
  user: DashboardUserDTO;
  properties: DashboardPropertySummaryDTO[];
  modules: string[];
}

export interface DashboardSummaryDTO {
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
