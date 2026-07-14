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
export type BookingPaymentStatus =
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED";
export type BookingRefundRequestStatus =
  | "REQUESTED"
  | "IN_REVIEW"
  | "REJECTED"
  | "FULFILLED"
  | "CANCELLED";
export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";
export type PaymentPurpose = "TOKEN" | "BALANCE" | "FULL_PAYMENT";
export type PaymentProvider = "MANUAL" | "RAZORPAY" | "STRIPE";
export type PaymentRefundStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";
export type PaymentMethod =
  | "CASH"
  | "UPI_MANUAL"
  | "BANK_TRANSFER"
  | "CARD_POS"
  | "MANUAL"
  | "ONLINE_GATEWAY";
export type RoomHousekeepingStatus =
  | "DIRTY"
  | "CLEANING"
  | "CLEAN"
  | "INSPECTED";
export type FolioChargeType =
  | "INCIDENTAL"
  | "PENALTY"
  | "EXTENSION"
  | "ADJUSTMENT";

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
  version: number;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  noShowAt: string | null;
  identityVerifiedAt: string | null;
  identityDocumentType: string | null;
  identityDocumentReference: string | null;
  subtotalAmount: string;
  totalAmount: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  taxBreakdown: Array<{
    taxId: string;
    name: string;
    taxType: "PERCENTAGE" | "FIXED";
    rate: number;
    appliesTo: string;
    itemId?: string;
    taxableAmount: number;
    taxAmount: number;
    included: boolean;
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
    reviewedAt: string | null;
    fulfilledAt: string | null;
    createdAt: string;
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
    paidAt: string | null;
    createdAt: string;
    refunds: Array<{
      id: string;
      refundRequestId: string | null;
      status: PaymentRefundStatus;
      method: PaymentMethod;
      amount: string;
      currency: string;
      reason: string;
      processedAt: string | null;
      createdAt: string;
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
      taxType: "PERCENTAGE" | "FIXED";
      rate: number;
      appliesTo: string;
      itemId?: string;
      taxableAmount: number;
      taxAmount: number;
      included: boolean;
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
    createdAt: string;
  }>;
  operationEvents: Array<{
    id: string;
    eventType: string;
    actorUserId: string | null;
    actorName: string | null;
    note: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
  folioCharges: Array<{
    id: string;
    type: FolioChargeType;
    status: "ACTIVE" | "VOID";
    description: string;
    amount: string;
    note: string | null;
    voidReason: string | null;
    createdByUserId: string;
    createdByName: string;
    voidedByUserId: string | null;
    voidedByName: string | null;
    voidedAt: string | null;
    createdAt: string;
  }>;
  folioTotal: string;
  createdAt: string;
  updatedAt: string;
};

export type UpdateBookingPayload = {
  status?: BookingStatus;
  note?: string;
  internalNotes?: string | null;
  roomId?: string;
  roomIds?: string[];
  statusOverride?: boolean;
  allowBalanceDueCheckIn?: boolean;
};

export type CheckInBookingPayload = {
  expectedVersion: number;
  roomIds?: string[];
  identityVerified: true;
  identityDocumentType?: string;
  identityDocumentReference?: string;
  allowBalanceDueCheckIn?: boolean;
  note?: string;
  policyFingerprint?: string;
  allowPolicyOverride?: boolean;
  overrideReason?: string;
};

export type CheckOutBookingPayload = {
  expectedVersion: number;
  allowBalanceDueCheckout?: boolean;
  note?: string;
  policyFingerprint?: string;
};

export type CheckInPolicyPreview = {
  bookingId: string;
  bookingVersion: number;
  isEarly: boolean;
  allowed: boolean;
  scheduledCheckInTime: string;
  feeAmount: string;
  policyFingerprint: string;
};

export type CheckOutPolicyPreview = {
  bookingId: string;
  bookingVersion: number;
  isEarly: boolean;
  unusedNights: number;
  refundAmount: string;
  manualReviewRequired: boolean;
  policyFingerprint: string;
  lateCheckoutCharge: null | {
    extraNights: number;
    totalAmount: string;
    tariffType: "NIGHTLY_RATE_MULTIPLIER" | "FIXED_AMOUNT";
    tariffValue: number;
  };
};

export type VersionedBookingNotePayload = {
  expectedVersion: number;
  note: string;
};

export type RoomMovePricingAction =
  | "CHARGE_DIFFERENCE"
  | "COMPLIMENTARY_UPGRADE"
  | "APPLY_CREDIT"
  | "NO_CREDIT";

export type RoomMovePreview = {
  bookingId: string;
  bookingVersion: number;
  effectiveDate: string;
  affectedNights: number;
  currentAssignment: string;
  destinationAssignment: string;
  currentNightlyRate: string;
  destinationNightlyRate: string;
  baseDifference: string;
  taxDifference: string;
  totalAdjustment: string;
  pricingFingerprint: string;
  pricingRequired: boolean;
  allowedPricingActions: RoomMovePricingAction[];
  movementType: "UPGRADE" | "DOWNGRADE" | "SAME_RATE";
  downgradeTreatment: "NO_CREDIT" | "CREDIT_DIFFERENCE" | "WAIVER";
  taxBreakdown: Array<{
    taxId: string;
    name: string;
    rate: number;
    amount: string;
  }>;
};

export type PreviewRoomMovePayload = {
  expectedVersion: number;
  roomIds: string[];
};

export type MoveRoomPayload = PreviewRoomMovePayload & {
  note: string;
  pricingFingerprint: string;
  expectedAdjustmentAmount: number;
  pricingAction: RoomMovePricingAction;
};

export type StayExtensionPreview = {
  bookingId: string;
  bookingVersion: number;
  originalCheckOutDate: string;
  newCheckOut: string;
  extraNights: number;
  currentAssignment: string;
  nightlyRate: string;
  baseAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
  resultingBalance: string;
  pricingFingerprint: string;
  conflicts: Array<{
    type: "BOOKING" | "MAINTENANCE" | "INVENTORY_LOCK";
    targetType: BookingTargetType;
    targetId: string;
    targetLabel: string;
  }>;
  taxBreakdown: Array<{
    taxId: string;
    name: string;
    rate: number;
    amount: string;
  }>;
};

export type PreviewStayExtensionPayload = {
  expectedVersion: number;
  newCheckOut: string;
};

export type CommitStayExtensionPayload = PreviewStayExtensionPayload & {
  pricingFingerprint: string;
  note: string;
  overrideReason?: string;
};

export type CorrectBookingStatusPayload = VersionedBookingNotePayload & {
  status: BookingStatus;
};

export type CreateFolioChargePayload = {
  expectedVersion: number;
  type: FolioChargeType;
  description: string;
  amount: number;
  note?: string;
};

export type RecordBalancePaymentPayload = {
  amount: number;
  method: PaymentMethod;
  referenceId?: string;
  payerDetail?: string;
  note?: string;
  paidAt?: string;
  idempotencyKey?: string;
};

export type RecordRefundPayload = {
  paymentId: string;
  amount: number;
  method: PaymentMethod;
  reason: string;
  refundRequestId?: string;
  idempotencyKey?: string;
};

export type UpdateRefundRequestPayload = {
  status?: Extract<BookingRefundRequestStatus, "IN_REVIEW" | "REJECTED">;
  adminNote?: string | null;
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
  couponCode?: string;
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
  housekeepingStatus: RoomHousekeepingStatus;
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

export type OperationsBoardResponse = {
  propertyId: string;
  propertyName: string;
  timezone: string;
  businessDate: string;
  summary: {
    arrivals: number;
    departures: number;
    inHouse: number;
    lateArrivals: number;
    unassignedArrivals: number;
    balanceDue: number;
    refundAttention: number;
    housekeeping: number;
    maintenanceConflicts: number;
  };
  arrivals: AdminBooking[];
  departures: AdminBooking[];
  inHouse: AdminBooking[];
  lateArrivals: AdminBooking[];
  unassignedArrivals: AdminBooking[];
  balanceDue: AdminBooking[];
  refundAttention: AdminBooking[];
  housekeeping: Array<{
    roomId: string;
    roomNumber: string;
    roomName: string;
    unitId: string;
    unitNumber: string;
    floor: number;
    status: RoomHousekeepingStatus;
  }>;
  maintenanceConflicts: Array<{
    maintenanceId: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";
    reason: string | null;
    booking: AdminBooking;
  }>;
};

export type CashierSummaryResponse = {
  propertyId: string;
  from: string;
  to: string;
  rows: Array<{
    receivedByUserId: string | null;
    receivedByName: string;
    byMethod: Partial<Record<PaymentMethod, number>>;
    refunds: number;
    collected: number;
    netCollected: number;
    expectedCash: number;
    history: Array<{
      id: string;
      bookingId: string;
      bookingRef: string;
      guestName: string;
      amount: number;
      type: "PAYMENT" | "REFUND";
      method: PaymentMethod;
      time: string;
    }>;
  }>;
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
