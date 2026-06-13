import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate, useParams, useSearchParams, Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiCreditCard,
  FiDownload,
  FiLoader,
  FiSmartphone,
  FiLock,
  FiShield,
  FiUser,
  FiCalendar,
} from "react-icons/fi";

import Button from "@/components/ui/Button";
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

  // Tabs and Form States for Gateway mockup
  const [activeTab, setActiveTab] = useState<"card" | "upi">("card");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [upiId, setUpiId] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const checkoutToken =
    bookingQuery.data !== undefined
      ? getBookingBillingCheckoutToken(bookingQuery.data.id, checkoutDraft)
      : undefined;
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
  const intentIssue = getIntentIssue(booking, intent);
  const paymentError = paymentMutation.error
    ? normalizeApiError(paymentMutation.error).message
    : null;

  // Custom formatting input helpers
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    const formatted = value.match(/.{1,4}/g)?.join(" ") || "";
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setExpiry(value.substring(0, 5));
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setCvv(value.substring(0, 3));
  };

  // Triggers the mock payment transaction
  const handleSimulatePayment = (status: "SUCCEEDED" | "FAILED") => {
    // Form validation
    const errors: Record<string, string> = {};
    if (activeTab === "card") {
      if (!cardName.trim()) {
        errors.cardName = "Cardholder name is required";
      }
      const cleanNum = cardNumber.replace(/\s+/g, "");
      if (cleanNum.length !== 16 || !/^\d+$/.test(cleanNum)) {
        errors.cardNumber = "Card number must be 16 digits";
      }
      if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        errors.expiry = "Expiry must be MM/YY format";
      } else {
        const [month] = expiry.split("/").map(Number);
        if (!month || month < 1 || month > 12) {
          errors.expiry = "Invalid expiry month";
        }
      }
      if (cvv.length !== 3 || !/^\d+$/.test(cvv)) {
        errors.cvv = "CVV must be 3 digits";
      }
    } else {
      if (!upiId.trim() || !upiId.includes("@")) {
        errors.upiId = "Enter a valid UPI ID (e.g. name@upi)";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    const attemptKey = getPaymentAttemptKey(booking.id, intent);

    paymentMutation.mutate(
      {
        bookingId: booking.id,
        idempotencyKey: attemptKey,
        amount,
        purpose: purposeByIntent[intent],
        status,
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
    setFormErrors({});
    setCardName("");
    setCardNumber("");
    setExpiry("");
    setCvv("");
    setUpiId("");
  };

  // Render check for simulated failure
  const isFailedSimulation =
    paymentMutation.isSuccess && paymentMutation.data?.payment.status === "FAILED";

  if (isFailedSimulation) {
    return (
      <section className="section bg-surface min-h-screen">
        <div className="container max-w-2xl">
          <div className="rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <FiAlertTriangle className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-black text-slate-900">
              Payment Declined / Attempt Failed
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Your payment attempt was declined by the simulated gateway.
            </p>
            <div className="mx-auto mt-6 w-full max-w-md divide-y divide-slate-200 rounded-2xl bg-red-50/50 px-5 py-4 text-left border border-red-100">
              <div className="py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Status</span>
                <p className="text-sm font-black text-red-700">FAILED</p>
              </div>
              <div className="py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Failure Code</span>
                <p className="text-sm font-semibold text-slate-700">
                  {paymentMutation.data?.payment.failureCode || "SIMULATED_FAILURE"}
                </p>
              </div>
              <div className="py-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Failure Message</span>
                <p className="text-sm font-medium text-slate-600">
                  {paymentMutation.data?.payment.failureMessage || "Transaction was declined by user request."}
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button type="button" variant="primary" onClick={handleTryAgain}>
                Try Again
              </Button>
              <Button to={ROUTES.BOOKING_PAYMENT(booking.id)} variant="secondary">
                Change Details
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Render check for intent already completed (success)
  if (paymentMutation.isSuccess || completedFromBooking) {
    return (
      <section className="section bg-slate-50/50 min-h-screen flex items-start justify-center py-12">
        <div className="container max-w-2xl px-4">
          <div className="rounded-3xl border border-slate-100 bg-white p-8 md:p-12 text-center shadow-xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-linear-to-b from-emerald-50/20 via-transparent to-transparent pointer-events-none"></div>

            {/* Glowing Success Ring */}
            <div className="relative flex justify-center mb-8">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl scale-75 animate-pulse"></div>
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500/20 bg-emerald-50 text-emerald-600 shadow-md">
                <FiCheckCircle className="h-10 w-10 animate-fade" />
              </div>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
              Booking Confirmed & Secured!
            </h1>
            <p className="mt-3 text-slate-500 font-medium max-w-lg mx-auto text-sm leading-relaxed">
              Your payment was processed successfully. We've updated your booking status and reserved your space.
            </p>

            {/* Stay Overview Grid */}
            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left space-y-4 max-w-xl mx-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Booking Reference</span>
                  <span className="block text-sm font-black text-slate-800 mt-1">{booking.bookingRef}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Guest Name</span>
                  <span className="block text-sm font-black text-slate-800 mt-1">{booking.guestName}</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stay Period</span>
                  <span className="block text-xs font-bold text-slate-700 mt-1">
                    {new Date(booking.from).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })} - {new Date(booking.to).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reserved Space</span>
                  <span className="block text-xs font-bold text-slate-700 mt-1">{booking.title}</span>
                </div>
              </div>
            </div>

            {/* Document Download Tiles */}
            {(invoiceDocument || receiptDocuments.length > 0) && (
              <div className="mt-8 text-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Download Booking Documents</h3>
                <div className={`grid gap-3 text-left max-w-xl mx-auto ${
                  (invoiceDocument ? 1 : 0) + receiptDocuments.length === 1
                    ? "grid-cols-1"
                    : "sm:grid-cols-2"
                }`}>
                  {invoiceDocument && (
                    <div className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-100 hover:shadow-indigo-50/30 transition duration-150 group">
                      <div className="pr-2 truncate">
                        <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">Booking Invoice</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{invoiceDocument.documentNumber}</span>
                      </div>
                      <button
                        type="button"
                        disabled={downloadBillingDocument.isPending}
                        onClick={() => {
                          void downloadBillingDocument.mutateAsync(invoiceDocument);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition duration-150 shrink-0"
                      >
                        <FiDownload className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  {receiptDocuments.map((receipt, index) => (
                    <div key={receipt.id} className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-indigo-100 hover:shadow-indigo-50/30 transition duration-150 group">
                      <div className="pr-2 truncate">
                        <span className="block text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition truncate">Receipt #{index + 1}</span>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">{receipt.documentNumber}</span>
                      </div>
                      <button
                        type="button"
                        disabled={downloadBillingDocument.isPending}
                        onClick={() => {
                          void downloadBillingDocument.mutateAsync(receipt);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition duration-150 shrink-0"
                      >
                        <FiDownload className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="mt-8 text-xs font-medium text-slate-400">
              We've sent a digital copy of your receipts and check-in voucher to <span className="font-bold text-slate-500">{booking.guestEmail}</span>.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-6">
              {isAuthenticated ? (
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
                <Button to={ROUTES.SPACES} variant="primary" size="md" className="px-6 h-11 shadow-md shadow-indigo-50">
                  Back to Spaces
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Render processing screen
  if (paymentMutation.isPending) {
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

  // Render general validation or network error
  if (paymentMutation.isError && !completedFromBooking) {
    return (
      <ProcessState
        tone="error"
        title="Payment could not be completed"
        message={paymentError ?? "Please try again."}
        bookingId={booking.id}
      >
        <Button type="button" variant="primary" onClick={handleTryAgain}>
          Retry Payment
        </Button>
      </ProcessState>
    );
  }

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

              {/* Tabs */}
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setActiveTab("card")}
                  className={`flex-1 py-4 text-center text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition ${
                    activeTab === "card"
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FiCreditCard className="h-4 w-4" />
                  Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("upi")}
                  className={`flex-1 py-4 text-center text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition ${
                    activeTab === "upi"
                      ? "border-indigo-600 text-indigo-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <FiSmartphone className="h-4 w-4" />
                  UPI Payment
                </button>
              </div>

              <div className="p-6 space-y-6">
                {activeTab === "card" ? (
                  <div className="space-y-6">
                    {/* Visual Card Mockup */}
                    <div className="relative w-full max-w-sm mx-auto h-48 rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 p-6 text-white shadow-lg overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-6 -mt-6"></div>
                      <div className="flex items-center justify-between z-10">
                        <div className="h-8 w-12 bg-amber-400/80 rounded-md opacity-80 relative flex items-center justify-center">
                          {/* Card chip */}
                          <div className="absolute inset-1 border border-amber-600/30 rounded-sm"></div>
                        </div>
                        <span className="font-black tracking-widest text-lg text-slate-400">VISA</span>
                      </div>
                      <div className="text-xl font-bold tracking-[0.2em] font-mono my-4 z-10">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>
                      <div className="flex justify-between items-end z-10">
                        <div className="max-w-[70%]">
                          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Cardholder</div>
                          <div className="text-sm font-bold truncate tracking-wide">
                            {cardName.toUpperCase() || "NAME SURNAME"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Expires</div>
                          <div className="text-sm font-bold font-mono tracking-wide">{expiry || "MM/YY"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid gap-4">
                      <div>
                        <label htmlFor="cardName" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Cardholder Name
                        </label>
                        <input
                          id="cardName"
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="John Doe"
                          className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
                            formErrors.cardName
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                          }`}
                        />
                        {formErrors.cardName && (
                          <p className="mt-1 text-xs font-bold text-red-600">{formErrors.cardName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="cardNumber" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Card Number
                        </label>
                        <input
                          id="cardNumber"
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4111 1111 1111 1111"
                          className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
                            formErrors.cardNumber
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                          }`}
                        />
                        {formErrors.cardNumber && (
                          <p className="mt-1 text-xs font-bold text-red-600">{formErrors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="expiry" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            Expiry Date
                          </label>
                          <input
                            id="expiry"
                            type="text"
                            value={expiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
                              formErrors.expiry
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                          />
                          {formErrors.expiry && (
                            <p className="mt-1 text-xs font-bold text-red-600">{formErrors.expiry}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="cvv" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                            CVV
                          </label>
                          <input
                            id="cvv"
                            type="password"
                            value={cvv}
                            onChange={handleCvvChange}
                            placeholder="•••"
                            className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
                              formErrors.cvv
                                ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                                : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            }`}
                          />
                          {formErrors.cvv && (
                            <p className="mt-1 text-xs font-bold text-red-600">{formErrors.cvv}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <div className="w-32 h-32 bg-white border border-slate-100 p-2 rounded-xl flex items-center justify-center shadow-sm">
                        {/* Mock QR Code */}
                        <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100">
                          <rect width="100" height="100" fill="none" />
                          <rect x="10" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="15" y="15" width="10" height="10" fill="white" />
                          <rect x="70" y="10" width="20" height="20" fill="currentColor" />
                          <rect x="75" y="15" width="10" height="10" fill="white" />
                          <rect x="10" y="70" width="20" height="20" fill="currentColor" />
                          <rect x="15" y="75" width="10" height="10" fill="white" />
                          {/* Random noise squares */}
                          <rect x="40" y="20" width="10" height="10" fill="currentColor" />
                          <rect x="50" y="35" width="15" height="10" fill="currentColor" />
                          <rect x="30" y="50" width="10" height="15" fill="currentColor" />
                          <rect x="55" y="55" width="10" height="10" fill="currentColor" />
                          <rect x="45" y="70" width="20" height="15" fill="currentColor" />
                          <rect x="75" y="45" width="15" height="20" fill="currentColor" />
                        </svg>
                      </div>
                      <p className="mt-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Scan QR or enter UPI ID</p>
                    </div>

                    <div>
                      <label htmlFor="upiId" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        UPI ID / VPA
                      </label>
                      <input
                        id="upiId"
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="john.doe@okaxis"
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 ${
                          formErrors.upiId
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        }`}
                      />
                      {formErrors.upiId && (
                        <p className="mt-1 text-xs font-bold text-red-600">{formErrors.upiId}</p>
                      )}
                    </div>
                  </div>
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

          {/* Stay Info Card Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs border-b border-slate-100 pb-4">Stay Summary</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Guest Details</div>
                  <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-2">
                    <FiUser className="text-slate-400" /> {booking.guestName}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Selected Space</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">
                    {booking.title} ({booking.spaceName})
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stay Period</div>
                  <div className="text-sm font-semibold text-slate-800 mt-1 flex items-center gap-2">
                    <FiCalendar className="text-slate-400" /> {new Date(booking.from).toLocaleDateString("en-IN")} - {new Date(booking.to).toLocaleDateString("en-IN")}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Total Amount</span>
                    <span className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mt-0.5">
                      {intentLabels[intent]}
                    </span>
                  </div>
                  <span className="text-2xl font-black text-slate-900">{formatPrice(amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
