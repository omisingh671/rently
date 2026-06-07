export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type PaymentProvider = "MANUAL" | "RAZORPAY" | "STRIPE";
export type PaymentPurpose = "TOKEN" | "BALANCE" | "FULL_PAYMENT";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

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

export type BookingType = "SINGLE_TARGET" | "MULTI_ROOM";
export type ComfortOption = "AC" | "NON_AC";
export type BookingPaymentPolicy =
  | "TOKEN_AT_BOOKING"
  | "NO_UPFRONT_PAYMENT";
export type AdvancePaymentType = "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";

export interface BookingPolicy {
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationRules: Record<string, unknown>;
  refundRules: Record<string, unknown>;
  earlyCheckoutRules: Record<string, unknown>;
  noShowRules: Record<string, unknown>;
  guestPolicyText: string;
}

export interface BookingPolicyPreview {
  bookingId: string;
  status: BookingStatus;
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
  nonRefundableAmount: number;
  tokenRefundable: boolean;
  guestPolicyText: string;
}

export interface BookingItem {
  id: string;
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  guestCount: number;
  comfortOption: ComfortOption;
  pricePerNight: number;
  pricingId: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdown[];
  totalAmount: number;
  finalAmount: number;
}

export interface TaxBreakdown {
  taxId: string;
  name: string;
  taxType: "PERCENTAGE" | "FIXED";
  rate: number;
  appliesTo: string;
  itemId?: string;
  taxableAmount: number;
  taxAmount: number;
  included: boolean;
}

export interface BookingQuoteItem {
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  guestCount: number;
  comfortOption: ComfortOption;
  pricePerNight: number;
  pricingId: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdown[];
  totalAmount: number;
  finalAmount: number;
  taxInclusive: boolean;
}

export interface BookingQuote {
  propertyId: string;
  bookingType: BookingType;
  nights: number;
  guestCount: number;
  comfortOption: ComfortOption;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  remainingPayAtCheckIn: number;
  couponCode: string | null;
  taxBreakdown: TaxBreakdown[];
  items: BookingQuoteItem[];
  policy: BookingPolicy;
}

export interface Booking {
  id: string;
  bookingRef: string;
  userId: string;
  spaceId: string;
  propertyId: string;
  bookingType: BookingType;
  guestCount: number;
  comfortOption: ComfortOption;
  title: string;
  spaceName: string;
  status: BookingStatus;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  tokenPaidAmount: number;
  tokenPaymentStatus: "NOT_REQUIRED" | "UNPAID" | "PAID";
  guestName: string;
  guestEmail: string;
  guestContactNumber: string | null;
  from: string;
  to: string;
  pricePerNight: number;
  subtotalAmount: number;
  totalPrice: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: TaxBreakdown[];
  paidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
  refundableAmount: number;
  balanceAmount: number;
  remainingPayAtCheckIn: number;
  policy: BookingPolicy;
  items: BookingItem[];
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  couponCode: string | null;
  refundRequest: {
    id: string;
    status: BookingRefundRequestStatus;
    reason: string;
    adminNote: string | null;
    reviewedAt: string | null;
    fulfilledAt: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
}

export interface CreateOptionBookingPayload {
  bookingOptionId: string;
  propertyId: string;
  inventoryLockToken?: string;
  from: string;
  to: string;
  guests: number;
  comfortOption: ComfortOption;
}

export interface InventoryLock {
  lockToken: string;
  expiresAt: string;
  ttlSeconds: number;
}

export interface BookingGuestDetails {
  name: string;
  email: string;
  contactNumber: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  propertyId: string;
  userId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateManualPaymentResponse {
  payment: Payment;
  booking: {
    id: string;
    status: BookingStatus;
    totalAmount: number;
    paymentStatus: BookingPaymentStatus;
    paidAmount: number;
    refundedAmount: number;
    netPaidAmount: number;
    refundableAmount: number;
    balanceAmount: number;
  };
}
