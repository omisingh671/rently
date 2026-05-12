export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED";

export type PaymentProvider = "MANUAL" | "RAZORPAY" | "STRIPE";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED";

export type BookingType = "SINGLE_TARGET" | "MULTI_ROOM";

export interface BookingItem {
  id: string;
  targetType: "ROOM" | "UNIT";
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  pricePerNight: number;
  totalAmount: number;
}

export interface Booking {
  id: string;
  bookingRef: string;
  userId: string;
  spaceId: string;
  propertyId: string;
  bookingType: BookingType;
  guestCount: number;
  title: string;
  spaceName: string;
  status: BookingStatus;
  guestName: string;
  guestEmail: string;
  guestContactNumber: string | null;
  from: string;
  to: string;
  pricePerNight: number;
  totalPrice: number;
  items: BookingItem[];
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
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
  };
}
