import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiDownload,
  FiLoader,
} from "react-icons/fi";

import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";
import {
  clearBookingCheckoutDraftForBooking,
  getBookingCheckoutDraft,
} from "@/features/bookings/bookingCheckoutDraft";
import {
  clearPaymentAttemptKey,
  getPaymentAttemptKey,
  parsePaymentIntent,
  type PaymentIntent,
} from "@/features/bookings/paymentAttempt";
import { useBooking, useCreateManualPayment } from "@/features/bookings/hooks";
import type { Booking, PaymentPurpose } from "@/features/bookings/types";
import { useAuthStore } from "@/stores/authStore";
import {
  useBookingBillingDocuments,
  useDownloadBillingDocument,
} from "@/features/billing/hooks";
import { normalizeApiError } from "@/utils/errors";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const intentLabels: Record<PaymentIntent, string> = {
  token: "Token Payment",
  full: "Full Payment",
  balance: "Pending Balance Payment",
};

const purposeByIntent: Record<PaymentIntent, PaymentPurpose> = {
  token: "TOKEN",
  full: "FULL_PAYMENT",
  balance: "BALANCE",
};

const getPaymentAmount = (booking: Booking, intent: PaymentIntent) => {
  if (intent === "token") {
    return Math.min(booking.upfrontAmount, booking.balanceAmount);
  }

  return booking.balanceAmount;
};

const hasIntentCompleted = (booking: Booking, intent: PaymentIntent) => {
  if (intent === "token") {
    return booking.tokenPaymentStatus === "PAID";
  }

  return booking.balanceAmount <= 0 && booking.paidAmount > 0;
};

const getCompletedAmount = (booking: Booking, intent: PaymentIntent) => {
  if (intent === "token") {
    return booking.tokenPaidAmount || booking.upfrontAmount;
  }

  if (intent === "balance") {
    return Math.max(0, booking.paidAmount - booking.tokenPaidAmount);
  }

  return booking.totalPrice;
};

const getIntentIssue = (booking: Booking, intent: PaymentIntent) => {
  if (hasIntentCompleted(booking, intent)) {
    return null;
  }

  const amount = getPaymentAmount(booking, intent);

  if (amount <= 0) {
    return "This booking does not have a pending payment balance.";
  }

  if ((intent === "token" || intent === "full") && booking.status !== "PENDING") {
    return "This booking has already moved past initial payment.";
  }

  if (
    intent === "balance" &&
    booking.status !== "CONFIRMED" &&
    booking.status !== "CHECKED_IN"
  ) {
    return "Pending balance payment is only available for confirmed or checked-in bookings.";
  }

  return null;
};

export default function BookingPaymentProcessPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const intent = parsePaymentIntent(searchParams.get("intent"));
  const bookingQuery = useBooking(id);
  const paymentMutation = useCreateManualPayment();
  const isAuthenticated = useAuthStore(
    (state) => state.status === "authenticated" && !!state.user,
  );
  const checkoutDraft = useMemo(() => getBookingCheckoutDraft(), []);
  const startedAttemptRef = useRef<string | null>(null);
  const checkoutToken =
    bookingQuery.data !== undefined &&
    checkoutDraft?.createdBookingId === bookingQuery.data.id
      ? checkoutDraft.payload.inventoryLockToken
      : undefined;
  const billingDocumentsQuery = useBookingBillingDocuments(
    bookingQuery.data?.id,
    checkoutToken,
    paymentMutation.isSuccess,
  );
  const downloadBillingDocument = useDownloadBillingDocument(checkoutToken);
  const billingDocuments = billingDocumentsQuery.data ?? [];
  const invoiceDocument = billingDocuments.find(
    (document) => document.type === "INVOICE",
  );
  const receiptDocuments = billingDocuments.filter(
    (document) => document.type === "RECEIPT",
  );

  useEffect(() => {
    const booking = bookingQuery.data;
    if (!booking || !id || intent === null || paymentMutation.isPending) {
      return;
    }

    const issue = getIntentIssue(booking, intent);
    if (
      issue !== null ||
      paymentMutation.isSuccess ||
      hasIntentCompleted(booking, intent)
    ) {
      return;
    }

    const attemptKey = getPaymentAttemptKey(booking.id, intent);
    if (startedAttemptRef.current === attemptKey) {
      return;
    }

    startedAttemptRef.current = attemptKey;
    paymentMutation.mutate(
      {
        bookingId: booking.id,
        idempotencyKey: attemptKey,
        amount: getPaymentAmount(booking, intent),
        purpose: purposeByIntent[intent],
      },
      {
        onSuccess: () => {
          clearPaymentAttemptKey(booking.id, intent);
          clearBookingCheckoutDraftForBooking(booking.id);
          void bookingQuery.refetch();
          void billingDocumentsQuery.refetch();
        },
        onError: () => {
          void bookingQuery.refetch();
        },
      },
    );
  }, [
    billingDocumentsQuery,
    bookingQuery,
    id,
    intent,
    paymentMutation,
  ]);

  useEffect(() => {
    const booking = bookingQuery.data;
    if (!booking || intent === null || !hasIntentCompleted(booking, intent)) {
      return;
    }

    clearPaymentAttemptKey(booking.id, intent);
    clearBookingCheckoutDraftForBooking(booking.id);
  }, [bookingQuery.data, intent]);

  if (!id) {
    return <Navigate to={ROUTES.BOOKINGS} replace />;
  }

  if (intent === null) {
    return (
      <ProcessState
        tone="error"
        title="Payment intent missing"
        message="We could not determine which payment to process."
        bookingId={id}
      />
    );
  }

  if (bookingQuery.isPending) {
    return (
      <ProcessState
        tone="loading"
        title="Preparing payment"
        message="Loading your booking before payment starts."
      />
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <ProcessState
        tone="error"
        title="Could not load booking"
        message={
          bookingQuery.error instanceof Error
            ? bookingQuery.error.message
            : "Please try again from your booking page."
        }
        bookingId={id}
      />
    );
  }

  const booking = bookingQuery.data;
  const amount = getPaymentAmount(booking, intent);
  const completedFromBooking = hasIntentCompleted(booking, intent);
  const intentIssue = getIntentIssue(booking, intent);
  const paymentError = paymentMutation.error
    ? normalizeApiError(paymentMutation.error).message
    : null;

  if (intentIssue && !paymentMutation.isSuccess && !completedFromBooking) {
    return (
      <ProcessState
        tone="info"
        title="Payment unavailable"
        message={intentIssue}
        bookingId={booking.id}
      />
    );
  }

  if (paymentMutation.isError && !completedFromBooking) {
    return (
      <ProcessState
        tone="error"
        title="Payment could not be completed"
        message={paymentError ?? "Please try again."}
        bookingId={booking.id}
      >
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            startedAttemptRef.current = null;
            paymentMutation.reset();
          }}
        >
          Retry Payment
        </Button>
      </ProcessState>
    );
  }

  if (paymentMutation.isSuccess || completedFromBooking) {
    const result = paymentMutation.data?.booking;
    const paidAmount = paymentMutation.data?.payment.amount ??
      getCompletedAmount(booking, intent);
    const balanceAmount = result?.balanceAmount ?? booking.balanceAmount;
    return (
      <section className="section bg-surface min-h-screen">
        <div className="container max-w-3xl">
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <FiCheckCircle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-black text-slate-900">
              Payment received successfully.
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Your booking balance has been updated.
            </p>
            {!isAuthenticated && (
              <p className="mt-3 text-xs font-semibold text-emerald-700">
                Save booking ref {booking.bookingRef} for support or front-desk
                follow-up.
              </p>
            )}
            <div className="mx-auto mt-6 w-full max-w-md divide-y divide-slate-200 rounded-2xl bg-slate-50 px-5 py-2 text-left">
              <SummaryItem label="Payment" value={intentLabels[intent]} />
              <SummaryItem label="Amount" value={formatPrice(paidAmount)} />
              <SummaryItem
                label="Balance"
                value={formatPrice(balanceAmount)}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {invoiceDocument && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={downloadBillingDocument.isPending}
                  onClick={() => {
                    void downloadBillingDocument.mutateAsync(invoiceDocument);
                  }}
                >
                  <FiDownload className="mr-2" />
                  Download Invoice
                </Button>
              )}
              {receiptDocuments.map((receipt) => (
                <Button
                  key={receipt.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={downloadBillingDocument.isPending}
                  onClick={() => {
                    void downloadBillingDocument.mutateAsync(receipt);
                  }}
                >
                  <FiDownload className="mr-2" />
                  Download Receipt
                </Button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-6">
              {isAuthenticated ? (
                <>
                  <Button
                    to={ROUTES.BOOKING_DETAIL(booking.id)}
                    variant="primary"
                    size="md"
                  >
                    View Booking Details
                  </Button>
                  <Button
                    to={`${ROUTES.ACCOUNT}?tab=bookings`}
                    variant="secondary"
                    size="md"
                  >
                    Account Bookings
                  </Button>
                </>
              ) : (
                <Button to={ROUTES.SPACES} variant="primary" size="md">
                  Back to Availability
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-3xl">
        <div className="rounded-3xl border border-indigo-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <FiLoader className="h-8 w-8 animate-spin" />
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-widest text-indigo-500">
              {intentLabels[intent]}
            </p>
            <h1 className="mt-2 text-2xl font-black text-slate-900">
              Processing payment...
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Please stay on this page while we confirm your payment.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <ProgressStep label="Preparing payment" state="complete" />
            <ProgressStep label="Processing payment" state="active" />
            <ProgressStep label="Confirming booking" state="pending" />
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Amount</span>
              <span className="font-bold text-slate-900">
                {formatPrice(amount)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start justify-center gap-1 py-3 text-left">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "complete" | "active" | "pending";
}) {
  const color =
    state === "complete"
      ? "bg-emerald-500"
      : state === "active"
        ? "bg-indigo-500"
        : "bg-slate-200";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-sm font-bold text-slate-700">{label}</span>
    </div>
  );
}

function ProcessState({
  tone,
  title,
  message,
  bookingId,
  children,
}: {
  tone: "loading" | "error" | "info";
  title: string;
  message: string;
  bookingId?: string;
  children?: ReactNode;
}) {
  const isError = tone === "error";

  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-2xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              isError
                ? "bg-red-50 text-red-500"
                : tone === "loading"
                  ? "bg-indigo-50 text-indigo-500"
                  : "bg-slate-50 text-slate-500"
            }`}
          >
            {tone === "loading" ? (
              <FiLoader className="h-7 w-7 animate-spin" />
            ) : isError ? (
              <FiAlertTriangle className="h-7 w-7" />
            ) : (
              <FiCreditCard className="h-7 w-7" />
            )}
          </div>
          <h1 className="mt-6 text-2xl font-black text-slate-900">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
            {bookingId && (
              <Button
                to={ROUTES.BOOKING_DETAIL(bookingId)}
                variant="secondary"
                icon={<FiArrowLeft />}
              >
                Booking Details
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
