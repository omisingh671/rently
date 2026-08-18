import { env } from "@/config/env.js";
import { PaymentProvider } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { mockGateway } from "./mock.gateway.js";
import { razorpayGateway } from "./razorpay.gateway.js";
import type { PaymentGatewayAdapter } from "./payment-gateway.adapter.js";

const liveGateways = new Map<PaymentProvider, PaymentGatewayAdapter>([
  [PaymentProvider.RAZORPAY, razorpayGateway],
]);

const configuredProviders = {
  razorpay: PaymentProvider.RAZORPAY,
} as const;

export const getDefaultPaymentProvider = () =>
  configuredProviders[env.PAYMENT_GATEWAY_PROVIDER];

export const getPaymentGateway = (provider: PaymentProvider) => {
  if (
    env.PAYMENT_GATEWAY_MODE === "mock" &&
    provider === mockGateway.provider
  ) {
    return mockGateway;
  }
  const gateway = liveGateways.get(provider);
  if (!gateway) {
    throw new HttpError(
      501,
      "PAYMENT_PROVIDER_NOT_CONFIGURED",
      `Payment provider ${provider} is not configured`,
    );
  }
  return gateway;
};

export const getDefaultPaymentGateway = () =>
  getPaymentGateway(getDefaultPaymentProvider());
