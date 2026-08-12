import { createHmac, timingSafeEqual } from "node:crypto";
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

const signatureFor = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest("hex");

const signaturesMatch = (expected: string, actual: string) => {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const actualBuffer = Buffer.from(actual, "utf8");
  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
};

const parseJsonObject = (rawBody: Buffer) => {
  let value: unknown;
  try {
    value = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Invalid webhook payload");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Invalid webhook payload");
  }
  return value as Record<string, unknown>;
};

const getEntity = (
  body: Record<string, unknown>,
  resource: "payment" | "refund",
) => {
  const payload = body.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Webhook payload is missing");
  }
  const resourceValue = (payload as Record<string, unknown>)[resource];
  if (
    resourceValue === null ||
    typeof resourceValue !== "object" ||
    Array.isArray(resourceValue)
  ) {
    throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", `Webhook ${resource} is missing`);
  }
  const entity = (resourceValue as Record<string, unknown>).entity;
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) {
    throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", `Webhook ${resource} is missing`);
  }
  return entity as Record<string, unknown>;
};

const requestRazorpay = async <T>(
  path: string,
  body?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${env.RAZORPAY_API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(
      503,
      "PAYMENT_PROVIDER_UNAVAILABLE",
      "The payment provider is temporarily unavailable. Please retry.",
    );
  }

  if (!response.ok) {
    throw new HttpError(
      502,
      "PAYMENT_PROVIDER_REJECTED",
      "The payment provider could not create this transaction.",
      { providerStatus: response.status },
    );
  }

  return (await response.json()) as T;
};

class RazorpayGateway implements PaymentGatewayAdapter {
  readonly provider = PaymentProvider.RAZORPAY;
  readonly mode = "LIVE" as const;

  async createCheckout(
    input: CreateGatewayCheckoutInput,
  ): Promise<GatewayCheckoutSession> {
    const order = await requestRazorpay<{
      id: string;
      amount: number;
      currency: string;
      status: string;
    }>("/orders", {
      amount: input.amountMinor,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    });

    return {
      providerOrderId: order.id,
      amountMinor: order.amount,
      currency: order.currency,
      status: order.status,
      launch: { strategy: "SDK", publicKey: env.RAZORPAY_KEY_ID },
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
      launch: { strategy: "SDK", publicKey: env.RAZORPAY_KEY_ID },
    };
  }

  async createRefund(input: CreateGatewayRefundInput): Promise<GatewayRefund> {
    const refund = await requestRazorpay<{ id: string; status: string }>(
      `/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
      {
        amount: input.amountMinor,
        receipt: input.receipt,
        notes: input.notes,
      },
    );
    return { id: refund.id, status: refund.status };
  }

  async fetchPayment(input: FetchGatewayPaymentInput): Promise<GatewayPayment> {
    if (!input.providerPaymentId) {
      throw new HttpError(
        422,
        "PAYMENT_PROVIDER_REFERENCE_MISSING",
        "Razorpay payment ID is required",
      );
    }
    const payment = await requestRazorpay<{
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
    }>(
      `/payments/${encodeURIComponent(input.providerPaymentId)}`,
      undefined,
      "GET",
    );
    return {
      id: payment.id,
      orderId: payment.order_id,
      amountMinor: payment.amount,
      currency: payment.currency,
      status: payment.status,
    };
  }

  verifyCheckoutResult(input: {
    orderId: string;
    paymentId?: string;
    signature?: string;
  }) {
    if (!input.paymentId || !input.signature) return false;
    const expected = signatureFor(
      `${input.orderId}|${input.paymentId}`,
      env.RAZORPAY_KEY_SECRET,
    );
    return signaturesMatch(expected, input.signature);
  }

  private verifyWebhookSignature(rawBody: Buffer, signature: string) {
    const expected = signatureFor(
      rawBody.toString("utf8"),
      env.RAZORPAY_WEBHOOK_SECRET,
    );
    return signaturesMatch(expected, signature);
  }

  parseWebhook(
    rawBody: Buffer,
    headers: GatewayWebhookHeaders,
  ): ParsedGatewayWebhook {
    const signature = headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !this.verifyWebhookSignature(rawBody, signature)) {
      throw new HttpError(
        400,
        "PAYMENT_WEBHOOK_SIGNATURE_INVALID",
        "Webhook signature is invalid",
      );
    }

    const body = parseJsonObject(rawBody);
    if (typeof body.event !== "string") {
      throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Webhook event is missing");
    }
    const eventType = body.event;
    const eventId = headers["x-razorpay-event-id"];

    if (eventType === "payment.captured" || eventType === "payment.failed") {
      const entity = getEntity(body, "payment");
      if (
        typeof entity.id !== "string" ||
        typeof entity.order_id !== "string" ||
        typeof entity.amount !== "number" ||
        typeof entity.currency !== "string" ||
        typeof entity.status !== "string"
      ) {
        throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Webhook payment is invalid");
      }
      return {
        ...(typeof eventId === "string" && { providerEventId: eventId }),
        eventType,
        payload: body,
        event:
          eventType === "payment.captured"
            ? {
                type: "PAYMENT_SUCCEEDED",
                providerOrderId: entity.order_id,
                providerPaymentId: entity.id,
                amountMinor: entity.amount,
                currency: entity.currency,
                providerStatus: entity.status,
              }
            : {
                type: "PAYMENT_FAILED",
                providerOrderId: entity.order_id,
                providerPaymentId: entity.id,
                amountMinor: entity.amount,
                currency: entity.currency,
                providerStatus: entity.status,
                ...(typeof entity.error_code === "string" && {
                  failureCode: entity.error_code,
                }),
                ...(typeof entity.error_description === "string" && {
                  failureMessage: entity.error_description,
                }),
              },
      };
    }

    if (eventType === "refund.processed" || eventType === "refund.failed") {
      const entity = getEntity(body, "refund");
      if (
        typeof entity.id !== "string" ||
        typeof entity.payment_id !== "string" ||
        typeof entity.amount !== "number" ||
        typeof entity.currency !== "string" ||
        typeof entity.status !== "string"
      ) {
        throw new HttpError(400, "PAYMENT_WEBHOOK_INVALID", "Webhook refund is invalid");
      }
      return {
        ...(typeof eventId === "string" && { providerEventId: eventId }),
        eventType,
        payload: body,
        event: {
          type: eventType === "refund.processed" ? "REFUND_SUCCEEDED" : "REFUND_FAILED",
          providerRefundId: entity.id,
          providerPaymentId: entity.payment_id,
          amountMinor: entity.amount,
          currency: entity.currency,
          providerStatus: entity.status,
        },
      };
    }

    return {
      ...(typeof eventId === "string" && { providerEventId: eventId }),
      eventType,
      payload: body,
      event: null,
    };
  }
}

export const razorpayGateway = new RazorpayGateway();
