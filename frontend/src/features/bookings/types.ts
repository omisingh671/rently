export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

export type PaymentProvider = "MANUAL" | "RAZORPAY" | "STRIPE";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type BookingType = "SINGLE_TARGET" | "MULTI_ROOM";
export type ComfortOption = "AC" | "NON_AC";
export type BookingPaymentPolicy =
  | "TOKEN_AT_BOOKING"
  | "NO_UPFRONT_PAYMENT";

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
  totalAmount: number;
}

export interface TaxBreakdown {
  taxId: string;
  name: string;
  taxType: "PERCENTAGE" | "FIXED";
  rate: number;
  appliesTo: string;
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
  totalAmount: number;
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
  balanceAmount: number;
  remainingPayAtCheckIn: number;
  items: BookingItem[];
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  couponCode: string | null;
  createdAt: string;
}

export interface CreateOptionBookingPayload {
  bookingOptionId: string;
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
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateManualPaymentResponse {
  payment: Payment;
  booking: {
    id: string;
    status: BookingStatus;
    totalAmount: number;
    paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID";
    paidAmount: number;
    balanceAmount: number;
  };
}
