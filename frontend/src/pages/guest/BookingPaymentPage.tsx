import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { FiCheckCircle, FiCreditCard } from "react-icons/fi";

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
import { normalizeApiError } from "@/utils/errors";

const paymentKeyPrefix = "sucasa:manual-payment";

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString();
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {booking.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Ref: {booking.bookingRef}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Guest
          </dt>
          <dd className="mt-1 text-sm text-slate-900">{booking.guestName}</dd>
          <dd className="text-sm text-slate-500">{booking.guestEmail}</dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Stay
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            {formatDate(booking.from)} to {formatDate(booking.to)}
          </dd>
          <dd className="text-sm text-slate-500">{booking.spaceName}</dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Price
          </dt>
          <dd className="mt-1 text-sm text-slate-900">
            INR {booking.pricePerNight} / night
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase text-slate-500">
            Total
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-900">
            INR {booking.totalPrice}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default function BookingPaymentPage() {
  const { id } = useParams();
  const bookingQuery = useBooking(id);
  const paymentMutation = useCreateManualPayment();
  const [paymentResult, setPaymentResult] =
    useState<CreateManualPaymentResponse | null>(null);

  if (!id) {
    return <Navigate to={ROUTES.BOOKINGS} replace />;
  }

  if (bookingQuery.status === "pending") {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="mb-4 text-2xl font-semibold">Booking payment</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-slate-500">
          Loading booking...
        </div>
      </div>
    );
  }

  if (bookingQuery.status === "error") {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="mb-4 text-2xl font-semibold">Booking payment</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
          {bookingQuery.error.message}
        </div>
      </div>
    );
  }

  const booking = bookingQuery.data;
  const isConfirmed =
    paymentResult !== null ||
    booking.status === "CONFIRMED" ||
    booking.status === "CHECKED_IN" ||
    booking.status === "CHECKED_OUT";
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
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6">
        <Link
          to={ROUTES.BOOKINGS}
          className="text-sm font-medium text-indigo-600 underline-offset-2 hover:underline"
        >
          Back to bookings
        </Link>
      </div>

      <div className="space-y-5">
        <BookingSummary booking={booking} />

        {isConfirmed ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-green-800">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-1 h-5 w-5 shrink-0" />
              <div>
                <h2 className="font-semibold">Booking confirmed</h2>
                <p className="mt-1 text-sm">
                  Payment has been recorded and your booking is confirmed.
                </p>
              </div>
            </div>
          </div>
        ) : booking.status === "PENDING" ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Manual payment
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Confirm this booking using the current manual payment flow.
                </p>
              </div>

              <Button
                type="button"
                variant="success"
                disabled={paymentMutation.isPending}
                onClick={() => {
                  void confirmManualPayment();
                }}
              >
                <FiCreditCard className="h-4 w-4" />
                {paymentMutation.isPending
                  ? "Confirming..."
                  : "Confirm payment"}
              </Button>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {paymentError}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
            This booking cannot be paid from its current status.
          </div>
        )}
      </div>
    </div>
  );
}
