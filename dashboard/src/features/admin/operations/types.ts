import type { PaginatedResult } from "@/common/types/pagination";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type LeadStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type BookingTargetType = "ROOM" | "UNIT";
export type BookingType = "SINGLE_TARGET" | "MULTI_ROOM";
export type ConcreteComfortOption = "AC" | "NON_AC";
export type ComfortOption = ConcreteComfortOption | "ALL";
export type BookingPaymentPolicy =
  | "TOKEN_AT_BOOKING"
  | "NO_UPFRONT_PAYMENT";

export type AdminBooking = {
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
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  totalAmount: string;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: string;
  internalNotes: string | null;
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
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type UpdateBookingPayload = {
  status?: BookingStatus;
  note?: string;
  internalNotes?: string | null;
  roomId?: string;
  statusOverride?: boolean;
};

export type CreateManualBookingPayload = {
  bookingType: BookingType;
  bookingOptionId?: string;
  spaceId?: string;
  spaceIds?: string[];
  from: string;
  to: string;
  guests: number;
  comfortOption: ConcreteComfortOption;
  guestName: string;
  guestEmail: string;
  countryCode?: string;
  contactNumber?: string;
  internalNotes?: string | null;
};

export type CheckManualBookingAvailabilityPayload = {
  spaceIds?: string[];
  from: string;
  to: string;
  guests: number;
  comfortOption: ConcreteComfortOption;
};

export type ManualBookingAvailabilityItem = {
  spaceId: string;
  bookingOptionId: string;
  title: string;
  guestSplit: string;
  comfortOption: ConcreteComfortOption;
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
};

export type ManualBookingAvailabilityResponse = {
  from: string;
  to: string;
  guests: number;
  availableSpaceIds: string[];
  items: ManualBookingAvailabilityItem[];
};

export type RoomBoardStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "MAINTENANCE"
  | "INACTIVE";

export type RoomBoardRoom = {
  roomId: string;
  roomNumber: string;
  roomName: string;
  unitId: string;
  unitNumber: string;
  floor: number;
  hasAC: boolean;
  maxOccupancy: number;
  inventoryStatus: string;
  isActive: boolean;
  boardStatus: RoomBoardStatus;
  reason: string | null;
  booking: {
    id: string;
    bookingRef: string;
    status: BookingStatus;
    bookingType: BookingType;
    guestName: string;
    guestCount: number;
    checkIn: string;
    checkOut: string;
    targetLabel: string;
  } | null;
  maintenance: {
    id: string;
    targetType: "PROPERTY" | "UNIT" | "ROOM";
    reason: string;
    startDate: string;
    endDate: string;
  } | null;
};

export type RoomBoardUnit = {
  unitId: string;
  unitNumber: string;
  floor: number;
  status: string;
  isActive: boolean;
  rooms: RoomBoardRoom[];
};

export type RoomBoardResponse = {
  propertyId: string;
  propertyName: string;
  from: string;
  to: string;
  summary: Record<RoomBoardStatus, number>;
  units: RoomBoardUnit[];
};

export type AdminEnquiry = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminQuote = {
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
  checkIn: string;
  checkOut: string;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BookingListResponse = PaginatedResult<AdminBooking>;
export type EnquiryListResponse = PaginatedResult<AdminEnquiry>;
export type QuoteListResponse = PaginatedResult<AdminQuote>;
