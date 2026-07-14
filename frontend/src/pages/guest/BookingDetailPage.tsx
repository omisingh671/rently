import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCreditCard,
  FiAlertTriangle,
  FiXCircle,
} from "react-icons/fi";

import {
  useBooking,
  useCancelBooking,
  useCancellationPreview,
  useCreateRefundRequest,
  useRefundPreview,
} from "@/features/bookings/hooks";
import type { BookingPolicyPreview } from "@/features/bookings/types";
import BookingCancellationPanel from "@/features/bookings/components/BookingCancellationPanel";
import BookingPaymentSummaryPanel from "@/features/bookings/components/BookingPaymentSummaryPanel";
import BookingStaySummaryPanel from "@/features/bookings/components/BookingStaySummaryPanel";
import {
  useBookingBillingDocuments,
  useDownloadBillingDocument,
} from "@/features/billing/hooks";
import BookingBillingDocumentsPanel from "@/features/billing/components/BookingBillingDocumentsPanel";
import type { BillingDocument } from "@/features/billing/types";
import { ROUTES } from "@/configs/routePaths";
import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { normalizeApiError } from "@/utils/errors";

const bookingStatusMap: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-indigo-100 text-indigo-700",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

const accountBookingsPath = `${ROUTES.ACCOUNT}?tab=bookings`;

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
    month: "long",
    year: "numeric",
  });
};

const formatPolicyTime = (time: string | undefined, fallback: string) => {
  const [hourValue, minuteValue] = (time ?? fallback).split(":").map(Number);
  if (
    !Number.isInteger(hourValue) ||
    !Number.isInteger(minuteValue) ||
    hourValue < 0 ||
    hourValue > 23 ||
    minuteValue < 0 ||
    minuteValue > 59
  ) {
    return fallback === "12:00" ? "12:00 PM" : "11:00 AM";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hourValue, minuteValue));
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBooking(id);
  const billingDocumentsQuery = useBookingBillingDocuments(id);
  const downloadBillingDocument = useDownloadBillingDocument();
  const cancelBooking = useCancelBooking();
  const cancellationPreview = useCancellationPreview();
  const createRefundRequest = useCreateRefundRequest();
  const refundPreview = useRefundPreview();
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
  const [cancellationPreviewData, setCancellationPreviewData] =
    useState<BookingPolicyPreview | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationError, setCancellationError] = useState("");
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [preview, setPreview] = useState<BookingPolicyPreview | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState("");
  const [billingDownloadError, setBillingDownloadError] = useState("");

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col items-center justify-center space-y-4 py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="text-slate-500 font-medium">
            Fetching your booking details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-3xl border border-red-100 bg-red-50 p-12 text-center">
          <FiAlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Oops! Something went wrong
          </h2>
          <p className="mt-2 text-slate-600">
            {error instanceof Error
              ? error.message
              : "We couldn't find the booking you're looking for."}
          </p>
          <Button
            onClick={() => navigate(accountBookingsPath)}
            className="mt-8"
            variant="secondary"
          >
            Back to My Bookings
          </Button>
        </div>
      </div>
    );
  }

  const canRequestRefund =
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    booking.refundableAmount > 0 &&
    (booking.refundRequest === null ||
      booking.refundRequest.status === "REJECTED" ||
      booking.refundRequest.status === "CANCELLED");
  const canPayPendingBalance =
    booking.balanceAmount > 0 &&
    (booking.status === "CONFIRMED" || booking.status === "CHECKED_IN");
  const canCancelBooking =
    booking.status === "PENDING" || booking.status === "CONFIRMED";
  const checkInTimeLabel = formatPolicyTime(booking.policy.checkInTime, "12:00");
  const checkOutTimeLabel = formatPolicyTime(
    booking.policy.checkOutTime,
    "11:00",
  );
  const paidDisplayAmount = booking.tokenPaidAmount;
  const balancePaidDisplayAmount = Math.max(
    0,
    Math.min(
      booking.totalPrice - paidDisplayAmount,
      booking.paidAmount - paidDisplayAmount,
    ),
  );
  const fullPaidDisplayAmount =
    paidDisplayAmount <= 0 ? Math.min(booking.paidAmount, booking.totalPrice) : 0;
  const showTokenAmountCard =
    booking.paymentPolicy === "TOKEN_AT_BOOKING" &&
    (paidDisplayAmount > 0 ||
      (booking.status === "PENDING" &&
        booking.tokenPaymentStatus === "UNPAID" &&
        booking.paidAmount <= 0));
  const showBalanceAmountCard = paidDisplayAmount > 0 && balancePaidDisplayAmount > 0;
  const showPaidAmountCard = paidDisplayAmount <= 0 && fullPaidDisplayAmount > 0;
  const showUpfrontAmountDue =
    booking.status === "PENDING" &&
    booking.paymentPolicy === "TOKEN_AT_BOOKING";
  const showPayAtProperty =
    booking.remainingPayAtCheckIn > 0 &&
    booking.status !== "PENDING" &&
    booking.status !== "CANCELLED" &&
    booking.status !== "NO_SHOW";
  const pendingBalancePaymentPath = `${ROUTES.BOOKING_PAYMENT_PROCESS(booking.id)}?intent=balance`;

  const submitRefundRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!refundReason.trim()) {
      setRefundError("Reason is required.");
      return;
    }

    try {
      setRefundError("");
      await createRefundRequest.mutateAsync({
        bookingId: booking.id,
        reason: refundReason.trim(),
      });
      setRefundReason("");
      setIsRefundModalOpen(false);
      setPreview(null);
    } catch (err) {
      setRefundError(normalizeApiError(err).message);
    }
  };

  const openRefundModal = () => {
    setIsRefundModalOpen(true);
    setPreview(null);
    refundPreview.mutate({ bookingId: booking.id }, { onSuccess: setPreview });
  };

  const openCancellationModal = () => {
    setIsCancellationModalOpen(true);
    setCancellationPreviewData(null);
    setCancellationReason(booking.cancellationReason ?? "");
    setCancellationError("");
    cancellationPreview.mutate(
      { bookingId: booking.id },
      { onSuccess: setCancellationPreviewData },
    );
  };

  const closeCancellationModal = () => {
    if (cancelBooking.isPending) return;
    setIsCancellationModalOpen(false);
    setCancellationPreviewData(null);
    setCancellationReason("");
    setCancellationError("");
  };

  const confirmCancellation = async () => {
    try {
      setCancellationError("");
      await cancelBooking.mutateAsync({
        bookingId: booking.id,
        reason: cancellationReason.trim() || undefined,
      });
      closeCancellationModal();
    } catch (err) {
      setCancellationError(normalizeApiError(err).message);
    }
  };

  const handleBillingDocumentDownload = (document: BillingDocument) => {
    setBillingDownloadError("");
    void downloadBillingDocument.mutateAsync(document).catch((err: unknown) => {
      setBillingDownloadError(normalizeApiError(err).message);
    });
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(accountBookingsPath)}
          className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <FiArrowLeft />
          Back
        </button>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Booking Details
              </h1>
              <StatusBadge
                status={booking.status}
                variantMap={bookingStatusMap}
                className="rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider shadow-sm"
              />
            </div>
            <p className="mt-2 text-slate-500 font-medium">
              Reference:{" "}
              <span className="text-slate-900 font-bold uppercase tracking-wider">
                {booking.bookingRef}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {booking.status === "PENDING" && (
              <Button
                to={ROUTES.BOOKING_PAYMENT(booking.id)}
                variant="primary"
                size="md"
                className="shadow-lg shadow-indigo-200"
              >
                <FiCreditCard className="mr-2" />
                Complete Payment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <BookingStaySummaryPanel
            booking={booking}
            checkInTimeLabel={checkInTimeLabel}
            checkOutTimeLabel={checkOutTimeLabel}
          />

          <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl">
            <h3 className="font-bold mb-4 text-slate-400">Need Help?</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              If you have any questions or need to make changes to your booking,
              please contact our support team.
            </p>
            <Button
              variant="secondary"
              onDark
              onClick={() => navigate(ROUTES.CONTACT)}
            >
              Contact Support
            </Button>
          </div>
        </div>

        {/* Right Column: Pricing & Payment */}
        <div className="space-y-8">
          <BookingPaymentSummaryPanel
            booking={booking}
            balancePaidDisplayAmount={balancePaidDisplayAmount}
            fullPaidDisplayAmount={fullPaidDisplayAmount}
            showTokenAmountCard={showTokenAmountCard}
            showBalanceAmountCard={showBalanceAmountCard}
            showPaidAmountCard={showPaidAmountCard}
            showUpfrontAmountDue={showUpfrontAmountDue}
            showPayAtProperty={showPayAtProperty}
            canPayPendingBalance={canPayPendingBalance}
            pendingBalancePaymentPath={pendingBalancePaymentPath}
          />

          <BookingCancellationPanel
            booking={booking}
            canRequestRefund={canRequestRefund}
            onRequestRefund={openRefundModal}
          />

          <BookingBillingDocumentsPanel
            documents={billingDocumentsQuery.data ?? []}
            isLoading={billingDocumentsQuery.isPending}
            isDownloading={downloadBillingDocument.isPending}
            downloadError={billingDownloadError}
            onDownload={handleBillingDocumentDownload}
          />

          {canCancelBooking && (
            <div className="rounded-3xl border border-red-100 bg-white p-4 shadow-sm">
              <Button
                type="button"
                variant="danger"
                outline
                className="w-full"
                onClick={openCancellationModal}
              >
                <FiXCircle className="mr-2" />
                Cancel Booking
              </Button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCancellationModalOpen}
        onClose={closeCancellationModal}
        title="Cancel Booking"
        size="md"
        disableBackdropClose={cancelBooking.isPending}
        disableEscapeClose={cancelBooking.isPending}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              Are you sure you want to cancel this booking?
            </p>
            <div className="mt-1 space-y-1 text-xs text-red-700">
              <p>Ref: {booking.bookingRef}</p>
              <p>
                {formatDate(booking.from)} - {formatDate(booking.to)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-900">
            {cancellationPreview.isPending ? (
              <p className="font-semibold">Checking cancellation policy...</p>
            ) : cancellationPreviewData ? (
              <div className="space-y-1">
                <p className="font-semibold">
                  Refund preview:{" "}
                  {formatPrice(cancellationPreviewData.refundableAmount)}
                </p>
                {cancellationPreviewData.nonRefundableAmount > 0 && (
                  <p>
                    Non-refundable amount:{" "}
                    {formatPrice(cancellationPreviewData.nonRefundableAmount)}
                  </p>
                )}
                <p>{cancellationPreviewData.guestPolicyText}</p>
              </div>
            ) : (
              <p className="font-semibold">
                Cancellation preview is unavailable.
              </p>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reason
            </span>
            <textarea
              value={cancellationReason}
              onChange={(event) => setCancellationReason(event.target.value)}
              rows={3}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-50"
              placeholder="Optional cancellation reason"
              disabled={cancelBooking.isPending || cancellationPreview.isPending}
            />
          </label>

          {cancellationError && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {cancellationError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              disabled={cancelBooking.isPending || cancellationPreview.isPending}
              onClick={closeCancellationModal}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={cancelBooking.isPending || cancellationPreview.isPending}
              onClick={() => {
                void confirmCancellation();
              }}
            >
              {cancelBooking.isPending ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => {
          if (createRefundRequest.isPending) return;
          setIsRefundModalOpen(false);
          setPreview(null);
          setRefundError("");
        }}
        title="Request Refund"
        size="md"
        disableBackdropClose={createRefundRequest.isPending}
        disableEscapeClose={createRefundRequest.isPending}
      >
        <form className="space-y-4" onSubmit={submitRefundRequest}>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Refundable amount
            </p>
            <p className="mt-1 text-2xl font-black text-amber-900">
              {formatPrice(preview?.refundableAmount ?? booking.refundableAmount)}
            </p>
            {refundPreview.isPending && (
              <p className="mt-2 text-xs font-semibold text-amber-700">
                Checking refund policy...
              </p>
            )}
            {preview && (
              <div className="mt-2 space-y-1 text-xs text-amber-800">
                {preview.nonRefundableAmount > 0 && (
                  <p>
                    Non-refundable amount:{" "}
                    {formatPrice(preview.nonRefundableAmount)}
                  </p>
                )}
                <p>{preview.guestPolicyText}</p>
              </div>
            )}
          </div>
          <label className="block text-sm">
            <span className="font-bold text-slate-700">Reason</span>
            <textarea
              value={refundReason}
              maxLength={1000}
              disabled={createRefundRequest.isPending}
              onChange={(event) => setRefundReason(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
              placeholder="Tell us why you are requesting a refund..."
            />
          </label>
          {refundError && (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {refundError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={createRefundRequest.isPending || refundPreview.isPending}
              onClick={() => {
                setIsRefundModalOpen(false);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={
                createRefundRequest.isPending || refundReason.trim().length === 0
                || refundPreview.isPending
              }
            >
              {createRefundRequest.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
