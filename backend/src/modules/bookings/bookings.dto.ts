import type {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingType,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  MaintenanceTargetType,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  RoomStatus,
  TaxType,
  UnitStatus,
} from "@/generated/prisma/enums.js";

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
  subtotalAmount: string;
  totalAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  taxBreakdown: Array<{
    taxId: string;
    name: string;
    taxType: TaxType;
    rate: number;
    appliesTo: string;
    itemId?: string;
    taxableAmount: number;
    taxAmount: number;
    included: boolean;
    isRefundable: boolean;
  }>;
  paymentStatus: BookingPaymentStatus;
  paidAmount: string;
  refundedAmount: string;
  netPaidAmount: string;
  refundableAmount: string;
  balanceAmount: string;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: string;
  noShowEligible: boolean;
  isCheckInDatePassed: boolean;
  internalNotes: string | null;
  couponCode: string | null;
  refundRequest: {
    id: string;
    status: BookingRefundRequestStatus;
    reason: string;
    adminNote: string | null;
    reviewedByUserId: string | null;
    reviewedByName: string | null;
    reviewedAt: Date | null;
    fulfilledAt: Date | null;
    createdAt: Date;
  } | null;
  payments: Array<{
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    purpose: PaymentPurpose;
    method: PaymentMethod;
    amount: string;
    refundedAmount: string;
    refundableAmount: string;
    currency: string;
    referenceId: string | null;
    payerDetail: string | null;
    note: string | null;
    receivedByUserId: string | null;
    paidAt: Date | null;
    createdAt: Date;
    refunds: Array<{
      id: string;
      refundRequestId: string | null;
      status: PaymentRefundStatus;
      method: PaymentMethod;
      amount: string;
      currency: string;
      reason: string;
      processedAt: Date | null;
      createdAt: Date;
    }>;
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
    pricingId: string | null;
    subtotalAmount: string;
    discountAmount: string;
    taxableAmount: string;
    taxAmount: string;
    taxBreakdown: Array<{
      taxId: string;
      name: string;
      taxType: TaxType;
      rate: number;
      appliesTo: string;
      itemId?: string;
      taxableAmount: number;
      taxAmount: number;
      included: boolean;
      isRefundable: boolean;
    }>;
    totalAmount: string;
    finalAmount: string;
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
