import type {
  AdvancePaymentType,
  BookingRefundRequestStatus,
  BookingStatus,
  ComfortOption,
  DiscountType,
  LeadStatus,
  MaintenanceTargetType,
  PaymentMethod,
  PricingTier,
  PropertyAssignmentRole,
  PropertyStatus,
  RateType,
  RoomProductCategory,
  RoomStatus,
  TenantStatus,
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
  UnitStatus,
  UserRole,
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

export interface DashboardUserListInput extends DashboardPaginationInput {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface DashboardSessionListInput extends DashboardPaginationInput {
  search?: string;
  userId?: string;
  role?: UserRole;
  status?: "active" | "expired";
}

export interface DashboardAssignmentListInput extends DashboardPaginationInput {
  propertyId?: string;
  role?: PropertyAssignmentRole;
}

export interface DashboardAmenityListInput extends DashboardPaginationInput {
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
  category?: TaxCategory;
  scope?: TaxScope;
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
  images?: string[];
}

export interface UpdateDashboardPropertyInput {
  tenantId?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: PropertyStatus;
  isActive?: boolean;
  images?: string[];
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
}

export interface UpdateDashboardBookingPolicyInput {
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  cancellationRules: Record<string, unknown>;
  refundRules: Record<string, unknown>;
  earlyCheckoutRules: Record<string, unknown>;
  noShowRules: Record<string, unknown>;
  guestPolicyText: string;
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

export interface UpdateDashboardUserStatusInput {
  isActive: boolean;
}

export interface UpdateDashboardUserRoleInput {
  role: Exclude<UserRole, "SUPER_ADMIN">;
}

export interface UpdateDashboardForcePasswordChangeInput {
  mustChangePassword: boolean;
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

export interface ReplaceDashboardPropertyAmenityAssignmentsInput {
  amenityIds: string[];
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
  hasAC?: boolean;
  maxOccupancy?: number;
  status?: RoomStatus;
  amenityIds?: string[];
}

export interface UpdateDashboardRoomInput {
  unitId?: string;
  name?: string;
  number?: string;
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
  roomId?: string | null;
  unitId?: string | null;
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
  roomId?: string | null;
  unitId?: string | null;
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
  category?: TaxCategory;
  scope?: TaxScope;
  targetType?: TaxTargetType;
  calculationMode?: TaxCalculationMode;
  discountTreatment?: TaxDiscountTreatment;
  minTariff?: number | null;
  maxTariff?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  priority?: number;
  appliesTo?: string;
  isRefundable?: boolean;
  isActive?: boolean;
}

export interface UpdateDashboardTaxInput {
  name?: string;
  rate?: number;
  taxType?: TaxType;
  category?: TaxCategory;
  scope?: TaxScope;
  targetType?: TaxTargetType;
  calculationMode?: TaxCalculationMode;
  discountTreatment?: TaxDiscountTreatment;
  minTariff?: number | null;
  maxTariff?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  priority?: number;
  appliesTo?: string;
  isRefundable?: boolean;
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
  oncePerUser?: boolean;
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
  oncePerUser?: boolean;
}

export interface UpdateDashboardBookingInput {
  status?: BookingStatus;
  internalNotes?: string | null;
  note?: string;
  roomId?: string;
  statusOverride?: boolean;
  allowBalanceDueCheckIn?: boolean;
}

export interface RecordDashboardBookingPaymentInput {
  amount: number;
  method: PaymentMethod;
  referenceId?: string;
  payerDetail?: string;
  note?: string;
  paidAt?: Date;
  idempotencyKey?: string;
}

export interface RecordDashboardBookingRefundInput {
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  reason: string;
  refundRequestId?: string;
  idempotencyKey?: string;
}

export interface UpdateDashboardRefundRequestInput {
  status?: Extract<BookingRefundRequestStatus, "IN_REVIEW" | "REJECTED">;
  adminNote?: string | null;
}

export interface CreateDashboardManualBookingInput {
  bookingType: "SINGLE_TARGET" | "MULTI_ROOM";
  bookingOptionId?: string;
  spaceId?: string;
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  comfortOption: ComfortOption;
  couponCode?: string | undefined;
  guestName: string;
  guestEmail: string;
  countryCode?: string;
  contactNumber?: string;
  internalNotes?: string | null;
}

export interface CheckDashboardManualBookingAvailabilityInput {
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  comfortOption: ComfortOption;
}

export interface DashboardRoomBoardInput {
  from: Date;
  to: Date;
}

export interface UpdateDashboardLeadInput {
  status: LeadStatus;
}
