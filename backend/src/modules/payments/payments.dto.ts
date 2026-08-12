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
  failureCode: string | null;
  failureMessage: string | null;
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

export interface GatewayCheckoutDTO {
  mode: "MOCK" | "LIVE";
  provider: PaymentProvider;
  strategy: "MOCK" | "SDK" | "REDIRECT";
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  name: string;
  description: string;
  publicKey?: string;
  sessionToken?: string;
  providerData?: Record<string, string>;
  redirectUrl?: string;
}

export interface CreateGatewayPaymentIntentDTO extends CreateManualPaymentDTO {
  checkout: GatewayCheckoutDTO;
}
