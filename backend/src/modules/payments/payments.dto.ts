import type {
  BookingStatus,
  PaymentProvider,
  PaymentStatus,
} from "@/generated/prisma/client.js";

export interface PaymentDTO {
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

export interface CreateManualPaymentDTO {
  payment: PaymentDTO;
  booking: {
    id: string;
    status: BookingStatus;
    totalAmount: number;
  };
}
