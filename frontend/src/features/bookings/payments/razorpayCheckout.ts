import type { GatewayPaymentIntentResponse } from "../types";
import type {
  CheckoutGuest,
  GatewayCheckoutResult,
} from "./paymentCheckout";

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayCheckoutResponse) => void;
  prefill?: CheckoutGuest;
  modal?: { ondismiss: () => void };
};

type RazorpayCheckout = {
  open: () => void;
  on: (event: "payment.failed", callback: () => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckout;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;

const loadRazorpayCheckout = () => {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Could not load secure payment checkout"));
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
};

export const openRazorpayCheckout = async (
  checkout: GatewayPaymentIntentResponse["checkout"],
  guest?: CheckoutGuest,
): Promise<GatewayCheckoutResult> => {
  if (!checkout.publicKey) {
    throw new Error("Razorpay checkout key is missing");
  }
  const publicKey = checkout.publicKey;

  await loadRazorpayCheckout();
  if (!window.Razorpay) {
    throw new Error("Secure payment checkout is unavailable");
  }

  const RazorpayCheckout = window.Razorpay;
  return new Promise<GatewayCheckoutResult>((resolve, reject) => {
    const instance = new RazorpayCheckout({
      key: publicKey,
      amount: checkout.amountMinor,
      currency: checkout.currency,
      name: checkout.name,
      description: checkout.description,
      order_id: checkout.providerOrderId,
      ...(guest !== undefined && { prefill: guest }),
      handler: (result) =>
        resolve({
          providerOrderId: result.razorpay_order_id,
          providerPaymentId: result.razorpay_payment_id,
          providerSignature: result.razorpay_signature,
        }),
      modal: {
        ondismiss: () => reject(new Error("Payment checkout was closed")),
      },
    });
    instance.on("payment.failed", () =>
      reject(new Error("The payment provider reported a failed payment")),
    );
    instance.open();
  });
};
