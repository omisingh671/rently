import type {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingType,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  DiscountType,
  LeadStatus,
  MaintenanceTargetType,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
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
  payAtCheckInEnabled: boolean;
  bookingTokenAmount: string;
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
  unitStatus: UnitStatus;
  unitIsActive: boolean;
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

export interface DashboardManualBookingAvailabilityItemDTO {
  spaceId: string;
  bookingOptionId: string;
  title: string;
  guestSplit: string;
  comfortOption: ComfortOption;
  itemCount: number;
  nightlyTotal: string;
  stayTotal: string;
  available: boolean;
  capacity: number;
  targetType: BookingTargetType;
  reason: string | null;
  guestCount: number | null;
  pricePerNight: string | null;
  priceBreakup: string[];
}

export interface DashboardManualBookingAvailabilityDTO {
  from: string;
  to: string;
  guests: number;
  availableSpaceIds: string[];
  items: DashboardManualBookingAvailabilityItemDTO[];
}

export type DashboardRoomBoardStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "MAINTENANCE"
  | "INACTIVE";

export interface DashboardRoomBoardRoomDTO {
  roomId: string;
  roomNumber: string;
  roomName: string;
  unitId: string;
  unitNumber: string;
  floor: number;
  hasAC: boolean;
  maxOccupancy: number;
  inventoryStatus: RoomStatus;
  isActive: boolean;
  boardStatus: DashboardRoomBoardStatus;
  reason: string | null;
  booking: {
    id: string;
    bookingRef: string;
    status: BookingStatus;
    bookingType: BookingType;
    guestName: string;
    guestCount: number;
    checkIn: Date;
    checkOut: Date;
    targetLabel: string;
  } | null;
  maintenance: {
    id: string;
    targetType: MaintenanceTargetType;
    reason: string;
    startDate: Date;
    endDate: Date;
  } | null;
}

export interface DashboardRoomBoardUnitDTO {
  unitId: string;
  unitNumber: string;
  floor: number;
  status: UnitStatus;
  isActive: boolean;
  rooms: DashboardRoomBoardRoomDTO[];
}

export interface DashboardRoomBoardDTO {
  propertyId: string;
  propertyName: string;
  from: string;
  to: string;
  summary: Record<DashboardRoomBoardStatus, number>;
  units: DashboardRoomBoardUnitDTO[];
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
  bookingType: BookingType;
  guestCount: number;
  comfortOption: ComfortOption;
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
  paymentStatus: BookingPaymentStatus;
  paidAmount: string;
  balanceAmount: string;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: string;
  noShowEligible: boolean;
  internalNotes: string | null;
  payments: Array<{
    id: string;
    status: PaymentStatus;
    purpose: PaymentPurpose;
    method: PaymentMethod;
    amount: string;
    currency: string;
    note: string | null;
    receivedByUserId: string | null;
    paidAt: Date | null;
    createdAt: Date;
  }>;
  items: Array<{
    id: string;
    targetType: BookingTargetType;
    unitId: string | null;
    roomId: string | null;
    productId: string | null;
    targetLabel: string;
    productName: string;
    capacity: number;
    guestCount: number;
    comfortOption: ComfortOption;
    pricePerNight: string;
    totalAmount: string;
  }>;
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
