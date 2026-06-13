import type {
  FolioChargeType,
  BookingRefundRequestStatus,
  BookingStatus,
  ComfortOption,
  PaymentMethod,
  RoomHousekeepingStatus,
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

export interface CheckInBookingInput {
  expectedVersion: number;
  roomIds?: string[];
  identityVerified: true;
  identityDocumentType?: string;
  identityDocumentReference?: string;
  allowBalanceDueCheckIn?: boolean;
  note?: string;
}

export interface CheckOutBookingInput {
  expectedVersion: number;
  allowBalanceDueCheckout?: boolean;
  note?: string;
}

export interface NoShowBookingInput {
  expectedVersion: number;
  note: string;
}

export interface MoveBookingRoomInput {
  expectedVersion: number;
  roomIds: string[];
  note: string;
}

export interface CorrectBookingStatusInput {
  expectedVersion: number;
  status: BookingStatus;
  note: string;
}

export interface UpdateRoomHousekeepingInput {
  expectedStatus: RoomHousekeepingStatus;
  status: RoomHousekeepingStatus;
  note?: string;
}

export interface CreateBookingFolioChargeInput {
  expectedVersion: number;
  type: FolioChargeType;
  description: string;
  amount: number;
  note?: string;
}

export interface VoidBookingFolioChargeInput {
  expectedVersion: number;
  reason: string;
}
