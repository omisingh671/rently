import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  FiCheckCircle,
  FiCreditCard,
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiInfo,
  FiMapPin,
  FiUser,
} from "react-icons/fi";

import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";
import {
  useBooking,
  useCreateManualPayment,
} from "@/features/bookings/hooks";
import type {
  Booking,
  CreateManualPaymentResponse,
} from "@/features/bookings/types";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";

const paymentKeyPrefix = "sucasa:manual-payment";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const createFallbackId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const createIdempotencyKey = (bookingId: string) => {
  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : createFallbackId();

  return `manual:${bookingId}:${randomId}`;
};

const getPaymentAttemptKey = (bookingId: string) => {
  const storageKey = `${paymentKeyPrefix}:${bookingId}`;

  try {
    const existing = window.sessionStorage.getItem(storageKey);
    if (existing) return existing;

    const next = createIdempotencyKey(bookingId);
    window.sessionStorage.setItem(storageKey, next);
    return next;
  } catch {
    return createIdempotencyKey(bookingId);
  }
};

const clearPaymentAttemptKey = (bookingId: string) => {
  try {
    window.sessionStorage.removeItem(`${paymentKeyPrefix}:${bookingId}`);
  } catch {
    // Storage can be unavailable in private contexts; payment still completed.
  }
};

function BookingSummary({ booking }: { booking: Booking }) {
  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <h2 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Booking Summary</h2>
        <StatusBadge
          status={booking.status}
          variantMap={{
            PENDING: "bg-amber-100 text-amber-700",
            CONFIRMED: "bg-emerald-100 text-emerald-700",
          }}
        />
      </div>

      <div className="p-8 flex-1 flex flex-col space-y-8">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 leading-tight">{booking.title}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">Ref: {booking.bookingRef}</p>
        </div>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <FiCalendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Stay Period</div>
              <div className="text-base font-semibold text-slate-700 mt-0.5">
                {formatDate(booking.from)} - {formatDate(booking.to)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <FiMapPin className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Space / Unit</div>
              <div className="text-base font-semibold text-slate-700 mt-0.5">{booking.spaceName}</div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
              <FiUsers className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Occupancy</div>
              <div className="text-base font-semibold text-slate-700 mt-0.5">{booking.guestCount} Guests</div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 mt-auto">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Price Details</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-base">
              <span className="text-slate-600">Nightly Rate</span>
              <span className="font-semibold text-slate-900">{formatPrice(booking.pricePerNight)}</span>
            </div>
            {booking.items.length > 1 && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-3 my-4">
                {booking.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{item.targetLabel}</span>
                    <span className="font-medium text-slate-700">{formatPrice(item.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-5 border-t border-slate-100">
              <span className="text-lg font-bold text-slate-900">Total Amount</span>
              <span className="text-2xl font-bold text-[rgb(var(--primary)/1)]">{formatPrice(booking.totalPrice)}</span>
            </div>
          </div>
        </div>

        {(booking.upfrontAmount > 0 || booking.remainingPayAtCheckIn > 0) && (
          <div className="bg-indigo-50/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-indigo-600">Token Amount (Due Now)</span>
              <span className="text-indigo-900">{formatPrice(booking.upfrontAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-slate-500">Pay at Check-in</span>
              <span className="text-slate-700">{formatPrice(booking.remainingPayAtCheckIn)}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-100/50 text-[11px] text-indigo-400 font-semibold italic">
              * Token amount is non-refundable
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default function BookingPaymentPage() {
  const { id } = useParams();
  const bookingQuery = useBooking(id);
  const paymentMutation = useCreateManualPayment();
  const isAuthenticated = useAuthStore(
    (state) => state.status === "authenticated" && !!state.user,
  );
  const [paymentResult, setPaymentResult] =
    useState<CreateManualPaymentResponse | null>(null);

  if (!id) {
    return <Navigate to={ROUTES.BOOKINGS} replace />;
  }

  if (bookingQuery.status === "pending") {
    return (
      <section className="section min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading booking details...</p>
        </div>
      </section>
    );
  }

  if (bookingQuery.status === "error") {
    return (
      <section className="section">
        <div className="container max-w-2xl text-center">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8">
            <h2 className="text-xl font-bold text-red-900">Error Loading Booking</h2>
            <p className="mt-2 text-red-700">{bookingQuery.error.message}</p>
            <Button className="mt-6" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </section>
    );
  }

  const booking = bookingQuery.data;
  const isConfirmed =
    paymentResult !== null ||
    ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(booking.status);

  const paymentError = paymentMutation.error
    ? normalizeApiError(paymentMutation.error).message
    : null;

  const confirmManualPayment = async () => {
    const idempotencyKey = getPaymentAttemptKey(booking.id);
    const result = await paymentMutation.mutateAsync({
      bookingId: booking.id,
      idempotencyKey,
    });

    clearPaymentAttemptKey(booking.id);
    setPaymentResult(result);
    await bookingQuery.refetch();
  };

  return (
    <section className="section bg-surface min-h-screen">
      <div className="container max-w-5xl">
        <Link
          to={ROUTES.SPACES}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition"
        >
          <FiArrowLeft className="h-4 w-4" />
          Back to Availability
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-12 items-stretch">
          {/* Left Section Wrapper */}
          <div className="lg:col-span-7 flex flex-col">
            <h1 className="text-3xl font-bold text-slate-900">Confirm Booking</h1>
            <p className="mt-2 text-slate-500">Review your stay details and complete the confirmation process.</p>

            <div className="mt-8 space-y-6 flex-1 flex flex-col">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FiUser className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">Guest Information</h2>
                </div>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contact Name</div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">{booking.guestName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email Address</div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">{booking.guestEmail}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mobile Number</div>
                    <div className="text-sm font-semibold text-slate-800 mt-1">{booking.guestContactNumber ?? "-"}</div>
                  </div>
                </div>
              </div>

              {isConfirmed ? (
                <div className="flex-1 rounded-2xl border border-emerald-100 bg-emerald-50 p-8 text-center shadow-sm animate-fade flex flex-col items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-4">
                    <FiCheckCircle className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-emerald-900">Booking Confirmed!</h2>
                  <p className="mt-2 text-emerald-700">
                    {booking.upfrontAmount > 0
                      ? "Your token payment has been recorded successfully."
                      : "No upfront payment was required. Your booking is all set!"}
                  </p>
                  <p className="mt-4 text-sm text-emerald-600/80">
                    A confirmation email has been sent to {booking.guestEmail}.
                  </p>
                  <div className="mt-8 pt-6 border-t border-emerald-200/50">
                    {isAuthenticated ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium text-emerald-800">
                            Want to manage your stay?
                          </p>
                          <p className="text-xs text-emerald-700/70 mt-1">
                            You can find all your booking details and status under the <span className="font-bold">Account &gt; Bookings</span> tab in your profile.
                          </p>
                        </div>
                        <Button
                          to={`${ROUTES.ACCOUNT}?tab=bookings`}
                          variant="secondary"
                          size="sm"
                          className="bg-emerald-100 border-emerald-200 text-emerald-700 hover:bg-emerald-200"
                        >
                          View My Booking
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-emerald-800">
                          Save your booking reference.
                        </p>
                        <p className="text-xs text-emerald-700/70 mt-1">
                          Use booking ref <span className="font-bold">{booking.bookingRef}</span> for support or front-desk follow-up.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : booking.status === "PENDING" ? (
                <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <FiCreditCard className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">Payment Selection</h2>
                  </div>

                  <div className="flex-1 rounded-xl border-2 border-indigo-100 bg-indigo-50/30 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900">Manual / On-arrival Payment</h3>
                          <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                            Secure your booking with a token payment of <span className="font-bold text-slate-900">{formatPrice(booking.upfrontAmount)}</span>. The remaining balance of <span className="font-bold text-slate-900">{formatPrice(booking.remainingPayAtCheckIn)}</span> is payable directly at check-in.
                          </p>
                          <p className="mt-3 text-[11px] font-semibold text-indigo-600/80 italic">
                            * Please note: The token amount is non-refundable upon cancellation.
                          </p>
                        </div>
                        <div className="hidden sm:block">
                          <div className="bg-white p-2 rounded-lg shadow-sm border border-indigo-100">
                            <FiCreditCard className="h-6 w-6 text-indigo-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full h-12 text-base shadow-lg shadow-indigo-200"
                        disabled={paymentMutation.isPending}
                        onClick={() => {
                          void confirmManualPayment();
                        }}
                      >
                        {paymentMutation.isPending ? "Confirming..." : "Confirm & Pay Token"}
                      </Button>
                      <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <FiInfo className="h-3 w-3" />
                        Secure Encrypted Transaction
                      </div>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 flex items-start gap-3">
                      <FiInfo className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700">{paymentError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm flex flex-col items-center justify-center">
                  <FiInfo className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-900">Payment Unavailable</h2>
                  <p className="mt-2 text-slate-500">This booking is currently in {booking.status} status and cannot be processed for payment.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Section Wrapper */}
          <div className="lg:col-span-5 flex flex-col">
            <BookingSummary booking={booking} />
          </div>
        </div>
      </div>
    </section>
  );
}
