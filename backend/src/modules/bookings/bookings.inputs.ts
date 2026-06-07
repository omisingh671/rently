import type {
  BookingRefundRequestStatus,
  BookingStatus,
  ComfortOption,
  PaymentMethod,
} from "@/generated/prisma/enums.js";

export interface DashboardPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardBookingListInput extends DashboardPaginationInput {
  propertyId: string;
  search?: string;
  status?: BookingStatus;
}

export interface UpdateDashboardBookingInput {
  status?: BookingStatus;
  internalNotes?: string | null;
  note?: string;
  roomId?: string;
  roomIds?: string[];
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
