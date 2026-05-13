import type {
  BookingStatus,
  DiscountType,
  LeadStatus,
  MaintenanceTargetType,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TenantStatus,
  TaxType,
  UnitStatus,
} from "@/generated/prisma/enums.js";

export interface DashboardPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardPropertyListInput extends DashboardPaginationInput {
  tenantId?: string;
  search?: string;
  status?: PropertyStatus;
  isActive?: boolean;
}

export interface DashboardTenantListInput extends DashboardPaginationInput {
  search?: string;
  status?: TenantStatus;
}

export interface DashboardAdminListInput extends DashboardPaginationInput {
  search?: string;
  isActive?: boolean;
}

export interface DashboardManagerListInput extends DashboardPaginationInput {
  search?: string;
  isActive?: boolean;
}

export interface DashboardAssignmentListInput extends DashboardPaginationInput {
  propertyId?: string;
  role?: PropertyAssignmentRole;
}

export interface DashboardAmenityListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  isActive?: boolean;
}

export interface DashboardUnitListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: UnitStatus;
  isActive?: boolean;
}

export interface DashboardRoomListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: RoomStatus;
  isActive?: boolean;
}

export interface DashboardMaintenanceListInput
  extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  targetType?: MaintenanceTargetType;
}

export interface DashboardRoomProductListInput
  extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  category?: RoomProductCategory;
}

export interface DashboardRoomPricingListInput
  extends DashboardPaginationInput {
  propertyId: string;
  productId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
}

export interface DashboardTaxListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  taxType?: TaxType;
  isActive?: boolean;
}

export interface DashboardCouponListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  discountType?: DiscountType;
  isActive?: boolean;
}

export interface DashboardBookingListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: BookingStatus;
}

export interface DashboardLeadListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: LeadStatus;
  source?: string;
}

export interface CreateDashboardPropertyInput {
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  status?: PropertyStatus;
}

export interface UpdateDashboardPropertyInput {
  tenantId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: PropertyStatus;
  isActive?: boolean;
}

export interface CreateDashboardTenantInput {
  name: string;
  slug?: string;
  primaryDomain?: string;
  status?: TenantStatus;
  brandName: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  defaultCurrency?: string;
  timezone?: string;
  payAtCheckInEnabled?: boolean;
  bookingTokenAmount?: number;
}

export interface UpdateDashboardTenantInput {
  name?: string;
  slug?: string;
  primaryDomain?: string | null;
  status?: TenantStatus;
  brandName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  defaultCurrency?: string;
  timezone?: string;
  payAtCheckInEnabled?: boolean;
  bookingTokenAmount?: number;
}

export interface CreateDashboardUserInput {
  fullName: string;
  email: string;
  password: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface UpdateDashboardUserInput {
  fullName?: string;
  isActive?: boolean;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateDashboardAssignmentInput {
  propertyId: string;
  userId: string;
  role: PropertyAssignmentRole;
}

export interface CreateDashboardAmenityInput {
  name: string;
  icon?: string;
}

export interface UpdateDashboardAmenityInput {
  name?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CreateDashboardUnitInput {
  unitNumber: string;
  floor: number;
  status?: UnitStatus;
  amenityIds?: string[];
}

export interface UpdateDashboardUnitInput {
  unitNumber?: string;
  floor?: number;
  status?: UnitStatus;
  isActive?: boolean;
  amenityIds?: string[];
}

export interface CreateDashboardRoomInput {
  unitId: string;
  name: string;
  number: string;
  rent: number;
  hasAC?: boolean;
  maxOccupancy?: number;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface UpdateDashboardRoomInput {
  unitId?: string;
  name?: string;
  number?: string;
  rent?: number;
  hasAC?: boolean;
  maxOccupancy?: number;
  status?: RoomStatus;
  isActive?: boolean;
  amenityIds?: string[];
}

export interface CreateDashboardMaintenanceInput {
  targetType: MaintenanceTargetType;
  unitId?: string;
  roomId?: string;
  reason?: string;
  startDate: Date;
  endDate: Date;
}

export interface UpdateDashboardMaintenanceInput {
  targetType?: MaintenanceTargetType;
  unitId?: string;
  roomId?: string;
  reason?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface CreateDashboardRoomProductInput {
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
}

export interface UpdateDashboardRoomProductInput {
  name?: string;
  occupancy?: number;
  hasAC?: boolean;
  category?: RoomProductCategory;
}

export interface CreateDashboardRoomPricingInput {
  productId: string;
  roomId?: string;
  unitId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
  minNights?: number;
  maxNights?: number;
  taxInclusive?: boolean;
  price: number;
  validFrom: Date;
  validTo?: Date;
}

export interface UpdateDashboardRoomPricingInput {
  productId?: string;
  roomId?: string;
  unitId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
  minNights?: number;
  maxNights?: number;
  taxInclusive?: boolean;
  price?: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface CreateDashboardTaxInput {
  name: string;
  rate: number;
  taxType?: TaxType;
  appliesTo?: string;
  isActive?: boolean;
}

export interface UpdateDashboardTaxInput {
  name?: string;
  rate?: number;
  taxType?: TaxType;
  appliesTo?: string;
  isActive?: boolean;
}

export interface CreateDashboardCouponInput {
  code: string;
  name: string;
  discountType?: DiscountType;
  discountValue: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom: Date;
  validTo?: Date;
  isActive?: boolean;
}

export interface UpdateDashboardCouponInput {
  code?: string;
  name?: string;
  discountType?: DiscountType;
  discountValue?: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom?: Date;
  validTo?: Date;
  isActive?: boolean;
}

export interface UpdateDashboardBookingInput {
  status?: BookingStatus;
  internalNotes?: string | null;
  note?: string;
}

export interface CreateDashboardManualBookingInput {
  bookingType: "SINGLE_TARGET" | "MULTI_ROOM";
  spaceId?: string;
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  guestName: string;
  guestEmail: string;
  countryCode?: string;
  contactNumber?: string;
  internalNotes?: string | null;
}

export interface CheckDashboardManualBookingAvailabilityInput {
  spaceIds: string[];
  from: Date;
  to: Date;
  guests: number;
}

export interface UpdateDashboardLeadInput {
  status: LeadStatus;
}
