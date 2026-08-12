import type { GatewayPaymentIntentResponse } from "../types";
import { openRazorpayCheckout } from "./razorpayCheckout";

export interface GatewayCheckoutResult {
  providerOrderId: string;
  providerPaymentId?: string;
  providerSignature?: string;
}

export interface CheckoutGuest {
  name?: string;
  email?: string;
  contact?: string;
}

export const openGatewayCheckout = (
  checkout: GatewayPaymentIntentResponse["checkout"],
  guest?: CheckoutGuest,
): Promise<GatewayCheckoutResult> => {
  if (checkout.strategy === "REDIRECT") {
    if (!checkout.redirectUrl) {
      throw new Error("Payment provider did not return a checkout URL");
    }
    window.location.assign(checkout.redirectUrl);
    return new Promise<GatewayCheckoutResult>(() => undefined);
  }

  if (checkout.strategy !== "SDK") {
    throw new Error("Payment checkout strategy is not supported");
  }

  switch (checkout.provider) {
    case "RAZORPAY":
      return openRazorpayCheckout(checkout, guest);
    case "STRIPE":
      throw new Error("Stripe checkout is not configured");
  }
};
