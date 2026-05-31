export type PaymentIntent = "token" | "full" | "balance";

const paymentKeyPrefix = "rently:payment-attempt";

const createFallbackId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createPaymentAttemptKey = (
  bookingId: string,
  intent: PaymentIntent,
) => {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : createFallbackId();

  return `payment:${bookingId}:${intent}:${randomId}`;
};

export const getPaymentAttemptKey = (
  bookingId: string,
  intent: PaymentIntent,
) => {
  const storageKey = `${paymentKeyPrefix}:${bookingId}:${intent}`;

  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const nextKey = createPaymentAttemptKey(bookingId, intent);
    window.sessionStorage.setItem(storageKey, nextKey);
    return nextKey;
  } catch {
    return createPaymentAttemptKey(bookingId, intent);
  }
};

export const clearPaymentAttemptKey = (
  bookingId: string,
  intent: PaymentIntent,
) => {
  try {
    window.sessionStorage.removeItem(
      `${paymentKeyPrefix}:${bookingId}:${intent}`,
    );
  } catch {
    // Storage can be unavailable in private contexts; payment still completed.
  }
};

export const parsePaymentIntent = (
  value: string | null,
): PaymentIntent | null => {
  if (value === "token" || value === "full" || value === "balance") {
    return value;
  }

  return null;
};
