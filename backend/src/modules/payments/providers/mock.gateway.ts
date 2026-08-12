import { randomUUID } from "node:crypto";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";
import { PaymentProvider } from "@/generated/prisma/client.js";
import type {
  CreateGatewayCheckoutInput,
  CreateGatewayRefundInput,
  GatewayCheckoutSession,
  FetchGatewayPaymentInput,
  GatewayPayment,
  GatewayRefund,
  GatewayWebhookHeaders,
  ParsedGatewayWebhook,
  PaymentGatewayAdapter,
  ResumeGatewayCheckoutInput,
} from "./payment-gateway.adapter.js";
import { createHmac, timingSafeEqual } from "node:crypto";

const createMockSignature = (value: string) =>
  createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(value).digest("hex");

class MockGateway implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.RAZORPAY;
  readonly mode = "MOCK" as const;

  async createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<GatewayCheckoutSession> {
    return {
      providerOrderId: `order_mock_${input.paymentId}`,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: "created",
      launch: { strategy: "MOCK" },
    };
  }

  async resumeCheckout(
    input: ResumeGatewayCheckoutInput,
  ): Promise<GatewayCheckoutSession> {
    return {
      providerOrderId: input.providerOrderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: "created",
      launch: { strategy: "MOCK" },
    };
  }

  async createRefund(_input: CreateGatewayRefundInput): Promise<GatewayRefund> {
    return { id: `rfnd_mock_${randomUUID()}`, status: "processed" };
  }

  async fetchPayment(input: FetchGatewayPaymentInput): Promise<GatewayPayment> {
    return {
      id: input.providerPaymentId ?? `pay_mock_${randomUUID()}`,
      orderId: input.providerOrderId,
      amountMinor: 0,
      currency: "INR",
      status: "captured",
    };
  }

  verifyCheckoutResult(input: {
    orderId: string;
    paymentId?: string;
    signature?: string;
  }) {
    if (!input.paymentId || !input.signature) return false;
    return createMockSignature(`${input.orderId}|${input.paymentId}`) === input.signature;
  }

  parseWebhook(
    rawBody: Buffer,
    headers: GatewayWebhookHeaders,
  ): ParsedGatewayWebhook {
    const signature = headers["x-mock-signature"];
    const expected = Buffer.from(createMockSignature(rawBody.toString("utf8")), "utf8");
    const actual = typeof signature === "string" ? Buffer.from(signature, "utf8") : Buffer.alloc(0);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new HttpError(400, "PAYMENT_WEBHOOK_SIGNATURE_INVALID", "Webhook signature is invalid");
    }
    const body = JSON.parse(rawBody.toString("utf8")) as ParsedGatewayWebhook;
    return body;
  }
}

export const mockGateway = new MockGateway();
export const signMockWebhook = createMockSignature;
