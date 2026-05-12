import type { PaginatedResult } from "@/common/types/pagination";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";

export type LeadStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
export type BookingTargetType = "ROOM" | "UNIT";

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
  internalNotes: string | null;
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
