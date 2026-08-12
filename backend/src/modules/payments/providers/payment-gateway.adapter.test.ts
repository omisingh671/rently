import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { PaymentProvider } from "@/generated/prisma/client.js";

Object.assign(process.env, {
  NODE_ENV: "test",
  JWT_ACCESS_SECRET: "unit-test-access-secret",
  JWT_REFRESH_SECRET: "unit-test-refresh-secret",
  MAIL_USER: "payments-unit@rently.test",
  MAIL_APP_PASS: "unit-test-mail-password",
  FRONTEND_URL: "http://localhost:5173",
  DASHBOARD_URL: "http://localhost:5174",
  PAYMENT_GATEWAY_MODE: "mock",
  PAYMENT_GATEWAY_PROVIDER: "razorpay",
  RAZORPAY_KEY_ID: "rzp_test_unit",
  RAZORPAY_KEY_SECRET: "unit-test-key-secret",
  RAZORPAY_WEBHOOK_SECRET: "unit-test-webhook-secret",
});

const [{ env }, { mockGateway, signMockWebhook }, { razorpayGateway }] =
  await Promise.all([
    import("@/config/env.js"),
    import("./mock.gateway.js"),
    import("./razorpay.gateway.js"),
  ]);

test("mock adapter satisfies the provider-neutral checkout contract", async () => {
  const checkout = await mockGateway.createCheckout({
    paymentId: "payment-1",
    amountMinor: 12500,
    currency: "INR",
    receipt: "payment-1",
    notes: { bookingId: "booking-1" },
  });

  assert.equal(mockGateway.provider, PaymentProvider.RAZORPAY);
  assert.equal(mockGateway.mode, "MOCK");
  assert.deepEqual(checkout, {
    providerOrderId: "order_mock_payment-1",
    amountMinor: 12500,
    currency: "INR",
    status: "created",
    launch: { strategy: "MOCK" },
  });
});

test("mock adapter verifies and parses normalized webhook events", () => {
  const payload = {
    providerEventId: "mock:event-1",
    eventType: "mock.payment.succeeded",
    payload: { paymentId: "pay_mock_1" },
    event: {
      type: "PAYMENT_SUCCEEDED",
      providerOrderId: "order_mock_1",
      providerPaymentId: "pay_mock_1",
      amountMinor: 12500,
      currency: "INR",
      providerStatus: "captured",
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const parsed = mockGateway.parseWebhook(rawBody, {
    "x-mock-signature": signMockWebhook(rawBody.toString("utf8")),
  });

  assert.deepEqual(parsed, payload);
  assert.throws(() =>
    mockGateway.parseWebhook(rawBody, { "x-mock-signature": "invalid" }),
  );
});

test("Razorpay adapter maps provider payloads to normalized events", () => {
  const payload = {
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_1",
          order_id: "order_1",
          amount: 12500,
          currency: "INR",
          status: "captured",
        },
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const parsed = razorpayGateway.parseWebhook(rawBody, {
    "x-razorpay-signature": signature,
    "x-razorpay-event-id": "event-1",
  });

  assert.equal(parsed.providerEventId, "event-1");
  assert.equal(parsed.eventType, "payment.captured");
  assert.deepEqual(parsed.event, {
    type: "PAYMENT_SUCCEEDED",
    providerOrderId: "order_1",
    providerPaymentId: "pay_1",
    amountMinor: 12500,
    currency: "INR",
    providerStatus: "captured",
  });
});
