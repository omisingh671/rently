import type {
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentPurpose,
  PaymentStatus,
} from "@/generated/prisma/client.js";

export interface PaymentDTO {
  id: string;
  bookingId: string;
  propertyId: string;
  userId: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  method: PaymentMethod;
  amount: number;
  currency: string;
  idempotencyKey: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  note: string | null;
  receivedByUserId: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface CreateManualPaymentDTO {
  payment: PaymentDTO;
  booking: {
    id: string;
    status: BookingStatus;
    totalAmount: number;
    paymentStatus: BookingPaymentStatus;
    paidAmount: number;
    balanceAmount: number;
  };
}
