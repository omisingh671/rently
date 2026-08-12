import type { PaymentProvider } from "@/generated/prisma/client.js";

export interface CreateGatewayCheckoutInput {
  paymentId: string;
  amountMinor: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}

export interface ResumeGatewayCheckoutInput {
  providerOrderId: string;
  amountMinor: number;
  currency: string;
}

export type GatewayCheckoutLaunch =
  | { strategy: "MOCK" }
  | {
      strategy: "SDK";
      publicKey?: string;
      sessionToken?: string;
      providerData?: Record<string, string>;
    }
  | { strategy: "REDIRECT"; redirectUrl: string };

export interface GatewayCheckoutSession {
  providerOrderId: string;
  amountMinor: number;
  currency: string;
  status: string;
  launch: GatewayCheckoutLaunch;
}

export interface CreateGatewayRefundInput {
  providerPaymentId: string;
  amountMinor: number;
  receipt: string;
  notes: Record<string, string>;
}

export interface GatewayRefund {
  id: string;
  status: string;
}

export interface GatewayPayment {
  id: string;
  orderId: string;
  amountMinor: number;
  currency: string;
  status: string;
}

export interface FetchGatewayPaymentInput {
  providerOrderId: string;
  providerPaymentId?: string;
}

export type GatewayEvent =
  | {
      type: "PAYMENT_SUCCEEDED";
      providerOrderId: string;
      providerPaymentId: string;
      amountMinor: number;
      currency: string;
      providerStatus: string;
    }
  | {
      type: "PAYMENT_FAILED";
      providerOrderId: string;
      providerPaymentId?: string;
      amountMinor: number;
      currency: string;
      providerStatus: string;
      failureCode?: string;
      failureMessage?: string;
    }
  | {
      type: "REFUND_SUCCEEDED" | "REFUND_FAILED";
      providerRefundId: string;
      providerPaymentId?: string;
      amountMinor: number;
      currency: string;
      providerStatus: string;
    };

export interface ParsedGatewayWebhook {
  providerEventId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  event: GatewayEvent | null;
}

export type GatewayWebhookHeaders = Readonly<
  Record<string, string | string[] | undefined>
>;

export interface PaymentGatewayAdapter {
  readonly provider: PaymentProvider;
  readonly mode: "MOCK" | "LIVE";
  createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<GatewayCheckoutSession>;
  resumeCheckout(
    input: ResumeGatewayCheckoutInput,
  ): Promise<GatewayCheckoutSession>;
  createRefund(input: CreateGatewayRefundInput): Promise<GatewayRefund>;
  fetchPayment(input: FetchGatewayPaymentInput): Promise<GatewayPayment>;
  verifyCheckoutResult(input: {
    orderId: string;
    paymentId?: string;
    signature?: string;
  }): boolean;
  parseWebhook(
    rawBody: Buffer,
    headers: GatewayWebhookHeaders,
  ): ParsedGatewayWebhook;
}
