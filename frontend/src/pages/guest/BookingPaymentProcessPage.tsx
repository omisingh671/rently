import { useEffect, useMemo } from "react";
import { Navigate, useParams, useSearchParams, Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiLock,
  FiShield,
} from "react-icons/fi";

import Button from "@/components/ui/Button";
import { publicEnv } from "@/configs/env";
import { ROUTES } from "@/configs/routePaths";
import {
  clearBookingCheckoutDraftForBooking,
  getBookingBillingCheckoutToken,
  getBookingCheckoutDraft,
} from "@/features/bookings/bookingCheckoutDraft";
import {
  clearPaymentAttemptKey,
  getPaymentAttemptKey,
  parsePaymentIntent,
  type PaymentIntent,
} from "@/features/bookings/paymentAttempt";
import { CardPaymentForm } from "@/features/bookings/components/payment/CardPaymentForm";
import {
  PaymentMethodTabs,
} from "@/features/bookings/components/payment/PaymentMethodTabs";
import { UpiPaymentForm } from "@/features/bookings/components/payment/UpiPaymentForm";
import { PaymentSummaryPanel } from "@/features/bookings/components/payment/PaymentSummaryPanel";
import { PaymentFailureState } from "@/features/bookings/components/payment/PaymentFailureState";
import { PaymentProcessingState } from "@/features/bookings/components/payment/PaymentProcessingState";
import { PaymentProcessState } from "@/features/bookings/components/payment/PaymentProcessState";
import { PaymentSuccessState } from "@/features/bookings/components/payment/PaymentSuccessState";
import { useBooking, useCreateManualPayment } from "@/features/bookings/hooks";
import { usePaymentProcessState } from "@/features/bookings/usePaymentProcessState";
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
  const checkoutDraft = useMemo(() => getBookingCheckoutDraft(), []);
  const checkoutToken =
    id !== undefined ? getBookingBillingCheckoutToken(id, checkoutDraft) : undefined;
  const bookingQuery = useBooking(id, true, checkoutToken);
  const paymentMutation = useCreateManualPayment();
  const isAuthenticated = useAuthStore(
    (state) => state.status === "authenticated" && !!state.user,
  );

  const {
    activeTab,
    cardName,
    cardNumber,
    expiry,
    cvv,
    upiId,
    formErrors,
    setActiveTab,
    setCardName,
    setUpiId,
    handleCardNumberChange,
    handleExpiryChange,
    handleCvvChange,
    validatePaymentForm,
    resetPaymentForm,
  } = usePaymentProcessState();

  const completedFromBooking =
    bookingQuery.data !== undefined &&
    intent !== null &&
    hasIntentCompleted(bookingQuery.data, intent);
  const completedFromMutation =
    paymentMutation.data?.payment.status === "SUCCEEDED";
  const billingDocumentsQuery = useBookingBillingDocuments(
    bookingQuery.data?.id,
    checkoutToken,
    completedFromMutation || completedFromBooking,
  );
  const downloadBillingDocument = useDownloadBillingDocument(checkoutToken);
  const billingDocuments = billingDocumentsQuery.data ?? [];
  const invoiceDocument = billingDocuments.find(
    (document) => document.type === "INVOICE",
  );
  const receiptDocuments = billingDocuments.filter(
    (document) => document.type === "RECEIPT",
  );

  // Auto clean attempt key only if the intent completed elsewhere or before mount
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
      <PaymentProcessState
        tone="error"
        title="Payment intent missing"
        message="We could not determine which payment to process."
        bookingId={id}
      />
    );
  }

  if (bookingQuery.isPending) {
    return (
      <PaymentProcessState
        tone="loading"
        title="Preparing payment"
        message="Loading your booking before payment starts."
      />
    );
  }

  if (bookingQuery.isError || !bookingQuery.data) {
    return (
      <PaymentProcessState
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
  if (
    booking.status === "PENDING" &&
    booking.paymentExpiresAt &&
    new Date(booking.paymentExpiresAt).getTime() <= Date.now()
  ) {
    return (
      <PaymentProcessState
        tone="error"
        title="Payment time expired"
        message="This pending booking can no longer accept payment. Please start a new booking."
        bookingId={booking.id}
      />
    );
  }
  const amount = getPaymentAmount(booking, intent);
  const intentIssue = getIntentIssue(booking, intent);
  const paymentError = paymentMutation.error
    ? normalizeApiError(paymentMutation.error).message
    : null;

  // Triggers the mock payment transaction
  const handleSimulatePayment = (status: "SUCCEEDED" | "FAILED") => {
    if (!validatePaymentForm()) return;

    const attemptKey = getPaymentAttemptKey(booking.id, intent);

    paymentMutation.mutate(
      {
        bookingId: booking.id,
        idempotencyKey: attemptKey,
        amount,
        purpose: purposeByIntent[intent],
        status,
        checkoutToken,
      },
      {
        onSuccess: (data) => {
          if (data.payment.status === "SUCCEEDED") {
            clearPaymentAttemptKey(booking.id, intent);
            clearBookingCheckoutDraftForBooking(booking.id);
          }
          void bookingQuery.refetch();
          void billingDocumentsQuery.refetch();
        },
        onError: () => {
          void bookingQuery.refetch();
        },
      },
    );
  };

  const handleTryAgain = () => {
    clearPaymentAttemptKey(booking.id, intent);
    paymentMutation.reset();
    resetPaymentForm();
  };

  // Render check for simulated failure
  const isFailedSimulation =
    paymentMutation.isSuccess && paymentMutation.data?.payment.status === "FAILED";

  if (isFailedSimulation) {
    return (
      <PaymentFailureState
        bookingId={booking.id}
        failureCode={
          paymentMutation.data?.payment.failureCode || "SIMULATED_FAILURE"
        }
        failureMessage={
          paymentMutation.data?.payment.failureMessage ||
          "Transaction was declined by user request."
        }
        onTryAgain={handleTryAgain}
      />
    );
  }

  // Render check for intent already completed (success)
  if (paymentMutation.isSuccess || completedFromBooking) {
    return (
      <PaymentSuccessState
        bookingRef={booking.bookingRef}
        guestName={booking.guestName}
        stayPeriod={`${new Date(booking.from).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - ${new Date(booking.to).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
        reservedSpace={booking.title}
        guestEmail={booking.guestEmail}
        invoiceDocument={invoiceDocument}
        receiptDocuments={receiptDocuments}
        isDownloading={downloadBillingDocument.isPending}
        onDownload={(document) => {
          void downloadBillingDocument.mutateAsync(document);
        }}
        actions={
          isAuthenticated ? (
            <>
              <Button
                to={ROUTES.BOOKING_DETAIL(booking.id)}
                variant="primary"
                size="md"
                className="px-6 h-11 shadow-md shadow-indigo-50 hover:shadow-indigo-100"
              >
                View Booking Details
              </Button>
              <Button
                to={`${ROUTES.ACCOUNT}?tab=bookings`}
                variant="secondary"
                size="md"
                className="px-6 h-11"
              >
                My Bookings
              </Button>
            </>
          ) : (
            <Button
              to={ROUTES.SPACES}
              variant="primary"
              size="md"
              className="px-6 h-11 shadow-md shadow-indigo-50"
            >
              Back to Spaces
            </Button>
          )
        }
      />
    );
  }

  if (!publicEnv.mockPaymentsEnabled) {
    return (
      <PaymentProcessState
        tone="info"
        title="Online payment unavailable"
        message="Online payment is not configured. Return to your booking and contact the property for payment assistance."
        bookingId={booking.id}
      />
    );
  }

  // Render processing screen
  if (paymentMutation.isPending) {
    return (
      <PaymentProcessingState
        paymentLabel={intentLabels[intent]}
        formattedAmount={formatPrice(amount)}
      />
    );
  }

  // Render general validation or network error
  if (paymentMutation.isError && !completedFromBooking) {
    return (
      <PaymentProcessState
        tone="error"
        title="Payment could not be completed"
        message={paymentError ?? "Please try again."}
        bookingId={booking.id}
      >
        <Button type="button" variant="primary" onClick={handleTryAgain}>
          Retry Payment
        </Button>
      </PaymentProcessState>
    );
  }

  if (intentIssue && !paymentMutation.isSuccess && !completedFromBooking) {
    return (
      <PaymentProcessState
        tone="info"
        title="Payment unavailable"
        message={intentIssue}
        bookingId={booking.id}
      />
    );
  }

  // Render the Mock Payment Gateway UI
  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-5xl">
        <Link
          to={ROUTES.BOOKING_PAYMENT(booking.id)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition mb-6"
        >
          <FiArrowLeft className="h-4 w-4" />
          Cancel and return
        </Link>

        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Form and Simulator Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Secure Payment Simulation</h2>
                  <p className="text-xs text-slate-500 font-medium">Gateway Sandbox Environment</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                  <FiLock className="h-3.5 w-3.5" /> Sandbox
                </div>
              </div>

              <PaymentMethodTabs
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              <div className="p-6 space-y-6">
                {activeTab === "card" ? (
                  <CardPaymentForm
                    cardName={cardName}
                    cardNumber={cardNumber}
                    expiry={expiry}
                    cvv={cvv}
                    errors={formErrors}
                    onCardNameChange={setCardName}
                    onCardNumberChange={handleCardNumberChange}
                    onExpiryChange={handleExpiryChange}
                    onCvvChange={handleCvvChange}
                  />
                ) : (
                  <UpiPaymentForm
                    upiId={upiId}
                    error={formErrors.upiId}
                    onChange={setUpiId}
                  />
                )}

                {/* Secure Disclaimer */}
                <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-4 mt-4 text-xs font-semibold text-slate-600 leading-normal">
                  <FiShield className="h-5 w-5 text-indigo-600 shrink-0" />
                  <p>
                    This is a secure sandbox gateway. None of your real payment cards or details will be billed or stored. Choose your simulated outcome below.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid gap-3 sm:grid-cols-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleSimulatePayment("FAILED")}
                    disabled={paymentMutation.isPending}
                    className="h-12 w-full inline-flex items-center justify-center font-bold px-6 rounded-xl border border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50 hover:border-red-300 transition duration-150 text-sm"
                  >
                    <FiAlertTriangle className="mr-2 h-4 w-4" />
                    Simulate Failure
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatePayment("SUCCEEDED")}
                    disabled={paymentMutation.isPending}
                    className="h-12 w-full inline-flex items-center justify-center font-bold px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition duration-150 text-sm"
                  >
                    <FiCheckCircle className="mr-2 h-4 w-4" />
                    Simulate Success
                  </button>
                </div>
              </div>
            </div>
          </div>

          <PaymentSummaryPanel
            guestName={booking.guestName}
            spaceLabel={`${booking.title} (${booking.spaceName})`}
            stayPeriod={`${new Date(booking.from).toLocaleDateString("en-IN")} - ${new Date(booking.to).toLocaleDateString("en-IN")}`}
            paymentLabel={intentLabels[intent]}
            formattedAmount={formatPrice(amount)}
          />
        </div>
      </div>
    </section>
  );
}
