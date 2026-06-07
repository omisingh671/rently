import { useState, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiUsers,
  FiTag,
  FiHome,
  FiClock,
  FiCreditCard,
  FiDownload,
  FiAlertTriangle,
  FiInfo,
  FiFileText,
  FiCheckCircle,
} from "react-icons/fi";

import {
  useBooking,
  useCancelBooking,
  useCancellationPreview,
  useCreateRefundRequest,
  useRefundPreview,
} from "@/features/bookings/hooks";
import type { BookingPolicyPreview } from "@/features/bookings/types";
import {
  useBookingBillingDocuments,
  useDownloadBillingDocument,
} from "@/features/billing/hooks";
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

const formatTime = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
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

const getCancellationRefundLabel = (booking: {
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
  refundRequest: {
    status: string;
  } | null;
}) => {
  if (booking.paidAmount <= 0) {
    return "No payment made";
  }

  if (booking.refundRequest?.status === "REQUESTED") {
    return "Refund request pending";
  }

  if (booking.refundRequest?.status === "IN_REVIEW") {
    return "Refund in review";
  }

  if (booking.refundRequest?.status === "FULFILLED") {
    return `Refunded ${formatPrice(booking.refundedAmount)}`;
  }

  if (booking.refundRequest?.status === "REJECTED") {
    return "Refund rejected";
  }

  if (booking.refundableAmount > 0) {
    return `Refund pending ${formatPrice(booking.refundableAmount)}`;
  }

  return `Refunded ${formatPrice(booking.refundedAmount)}`;
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
          {/* Stay Info Card */}
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className="bg-slate-50 border-b border-slate-200 px-8 py-5">
              <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <FiHome className="text-indigo-500" />
                Stay Details
              </h2>
            </div>

            <div className="p-8">
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-6">
                  <DetailItem
                    icon={<FiCalendar className="text-slate-400" />}
                    label="Check-in"
                    value={formatDate(booking.from)}
                    subValue={`After ${checkInTimeLabel}`}
                  />
                  <DetailItem
                    icon={<FiUsers className="text-slate-400" />}
                    label="Guests"
                    value={`${booking.guestCount} Adults`}
                    subValue={
                      booking.comfortOption === "AC"
                        ? "AC Premium"
                        : "Non-AC Standard"
                    }
                  />
                </div>
                <div className="space-y-6">
                  <DetailItem
                    icon={<FiCalendar className="text-slate-400" />}
                    label="Check-out"
                    value={formatDate(booking.to)}
                    subValue={`Before ${checkOutTimeLabel}`}
                  />
                  <DetailItem
                    icon={<FiClock className="text-slate-400" />}
                    label="Booked On"
                    value={formatDate(booking.createdAt)}
                    subValue={formatTime(booking.createdAt)}
                  />
                </div>
              </div>

              <div className="mt-10 border-t border-slate-100 pt-8">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
                  Items in this booking
                </h3>
                <div className="space-y-3">
                  {booking.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-indigo-500">
                          <FiHome />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">
                            {item.productName}
                          </p>
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                            {item.targetLabel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">
                          {formatPrice(item.totalAmount)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                          {formatPrice(item.pricePerNight)} / night
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Guest Details */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900 flex items-center gap-3">
              <FiUsers className="text-indigo-500" />
              Guest Information
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Guest Name
                </p>
                <p className="font-bold text-slate-900">{booking.guestName}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Email Address
                </p>
                <p className="font-bold text-slate-900 truncate">
                  {booking.guestEmail}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Phone Number
                </p>
                <p className="font-bold text-slate-900">
                  {booking.guestContactNumber ?? "Not provided"}
                </p>
              </div>
            </div>
          </section>

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
          {/* Pricing Summary */}
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-900 flex items-center gap-3">
              <FiCreditCard className="text-indigo-500" />
              Payment Summary
            </h2>

            <div className="space-y-4">
              <div className="flex justify-between text-sm font-medium text-slate-600">
                <span>Total Stay Price</span>
                <span className="font-bold text-slate-900">
                  {formatPrice(
                    booking.subtotalAmount ||
                      booking.totalPrice + booking.discountAmount,
                  )}
                </span>
              </div>

              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-sm font-medium text-emerald-600">
                  <div className="flex items-center gap-1.5">
                    <FiTag className="h-3.5 w-3.5" />
                    <span>
                      Discount{" "}
                      {booking.couponCode ? `(${booking.couponCode})` : ""}
                    </span>
                  </div>
                  <span className="font-bold">
                    -{formatPrice(booking.discountAmount)}
                  </span>
                </div>
              )}

              {booking.taxBreakdown.map((tax) => (
                <div
                  key={`${tax.taxId}-${tax.included ? "in" : "ex"}`}
                  className="flex justify-between text-sm font-medium text-slate-600"
                >
                  <span>
                    {tax.name} {tax.included ? "(included)" : ""}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatPrice(tax.taxAmount)}
                  </span>
                </div>
              ))}

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-base font-extrabold text-slate-900">
                  <span>Grand Total</span>
                  <span className="text-xl text-indigo-600">
                    {formatPrice(booking.totalPrice)}
                  </span>
                </div>
              </div>

              {showTokenAmountCard && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Token Amount
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900">
                        {formatPrice(booking.upfrontAmount)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        booking.tokenPaymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : booking.tokenPaymentStatus === "UNPAID"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {booking.tokenPaymentStatus === "PAID"
                        ? "Paid"
                        : booking.tokenPaymentStatus === "UNPAID"
                          ? "Unpaid"
                          : "Not required"}
                    </span>
                  </div>
                  {booking.tokenPaymentStatus === "PAID" && (
                    <p className="mt-2 text-xs font-semibold text-emerald-700">
                      Received {formatPrice(booking.tokenPaidAmount)}
                    </p>
                  )}
                </div>
              )}

              {showBalanceAmountCard && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Balance Amount
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900">
                        {formatPrice(balancePaidDisplayAmount)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Paid
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Received {formatPrice(balancePaidDisplayAmount)}
                  </p>
                </div>
              )}

              {showPaidAmountCard && (
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Paid Amount
                      </p>
                      <p className="mt-1 text-lg font-black text-slate-900">
                        {formatPrice(fullPaidDisplayAmount)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Paid
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    Received {formatPrice(fullPaidDisplayAmount)}
                  </p>
                </div>
              )}

              {booking.status === "PENDING" &&
                booking.paymentPolicy === "TOKEN_AT_BOOKING" && (
                  <div className="mt-6 rounded-2xl bg-indigo-50 p-4 border border-indigo-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2">
                      Upfront Amount Due
                    </p>
                    <p className="text-2xl font-black text-indigo-900">
                      {formatPrice(booking.upfrontAmount)}
                    </p>
                    <p className="mt-1 text-[10px] text-indigo-500 font-bold uppercase leading-tight">
                      Required to confirm your stay
                    </p>
                  </div>
                )}

              {booking.remainingPayAtCheckIn > 0 &&
                booking.status !== "PENDING" &&
                booking.status !== "CANCELLED" &&
                booking.status !== "NO_SHOW" && (
                  <div className="mt-4 flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-100">
                    <FiInfo className="mt-0.5 text-amber-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-amber-900">
                        Pay at Property
                      </p>
                      <p className="text-lg font-black text-amber-600">
                        {formatPrice(booking.remainingPayAtCheckIn)}
                      </p>
                      <p className="text-[10px] font-medium text-amber-700 mt-0.5">
                        Pay this balance during check-in
                      </p>
                      {canPayPendingBalance && (
                        <Button
                          to={`${ROUTES.BOOKING_PAYMENT_PROCESS(booking.id)}?intent=balance`}
                          size="sm"
                          variant="primary"
                          className="mt-4"
                        >
                          <FiCreditCard className="mr-2" />
                          Pay Pending Balance
                        </Button>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </section>

          {/* Cancellation Info */}
          {(booking.status === "CANCELLED" || booking.status === "NO_SHOW") && (() => {
            const isNoShow = booking.status === "NO_SHOW";
            const isRefundFulfilled = booking.refundRequest?.status === "FULFILLED";
            
            const theme = isRefundFulfilled
              ? {
                  cardBg: "border-emerald-100 bg-emerald-50",
                  heading: "text-emerald-900",
                  icon: "text-emerald-500",
                  label: "text-emerald-500",
                  text: "text-emerald-900",
                  subtext: "text-emerald-700",
                  btn: "primary" as const,
                }
              : {
                  cardBg: "border-red-100 bg-red-50",
                  heading: "text-red-900",
                  icon: "text-red-500",
                  label: "text-red-400",
                  text: "text-red-900",
                  subtext: "text-red-700",
                  btn: "danger" as const,
                };

            return (
              <section className={`rounded-3xl border p-8 ${theme.cardBg}`}>
                <h2 className={`mb-4 text-lg font-bold flex items-center gap-3 ${theme.heading}`}>
                  {isRefundFulfilled ? (
                    <FiCheckCircle className={theme.icon} />
                  ) : isNoShow ? (
                    <FiAlertTriangle className={theme.icon} />
                  ) : (
                    <FiXCircle className={theme.icon} />
                  )}
                  {isNoShow ? "No-Show Info" : "Cancellation Info"}
                </h2>
                <div className="space-y-4">
                  {booking.cancelledAt && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}>
                        Date Cancelled
                      </p>
                      <p className={`font-bold ${theme.text}`}>
                        {formatDate(booking.cancelledAt)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}>
                      Refund Status
                    </p>
                    <p className={`font-bold ${theme.text}`}>
                      {getCancellationRefundLabel(booking)}
                    </p>
                  </div>
                  {booking.refundRequest && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}>
                        Refund Request
                      </p>
                      <p className={`mt-1 text-sm font-semibold ${theme.text}`}>
                        {booking.refundRequest.status.replaceAll("_", " ")}
                      </p>
                      <p className={`mt-1 text-sm ${theme.subtext}`}>
                        {booking.refundRequest.reason}
                      </p>
                      {booking.refundRequest.adminNote && (
                        <p className={`mt-1 text-sm ${theme.subtext}`}>
                          Admin note: {booking.refundRequest.adminNote}
                        </p>
                      )}
                    </div>
                  )}
                  {booking.cancellationReason && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.label}`}>
                        Reason
                      </p>
                      <p className={`mt-1 text-sm italic ${theme.subtext}`}>
                        "{booking.cancellationReason}"
                      </p>
                    </div>
                  )}
                  {canRequestRefund && (
                    <Button
                      type="button"
                      variant={theme.btn}
                      size="sm"
                      onClick={openRefundModal}
                    >
                      Request Refund
                    </Button>
                  )}
                </div>
              </section>
            );
          })()}

          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="mb-6 flex items-center gap-3 text-lg font-bold text-slate-900">
              <FiFileText className="text-indigo-500" />
              Billing Documents
            </h2>
            {billingDownloadError && (
              <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {billingDownloadError}
              </div>
            )}
            {billingDocumentsQuery.isPending ? (
              <p className="text-sm text-slate-500">Loading documents...</p>
            ) : (billingDocumentsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">
                Billing documents will appear here after confirmation or
                successful payment.
              </p>
            ) : (
              <div className="space-y-3">
                {(billingDocumentsQuery.data ?? []).map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {document.documentNumber}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {document.type.replaceAll("_", " ")} / {document.status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={downloadBillingDocument.isPending}
                      onClick={() => {
                        setBillingDownloadError("");
                        void downloadBillingDocument
                          .mutateAsync(document)
                          .catch((err: unknown) => {
                            setBillingDownloadError(
                              normalizeApiError(err).message,
                            );
                          });
                      }}
                    >
                      <FiDownload className="mr-2" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

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

function DetailItem({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">{icon}</div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 text-lg font-extrabold text-slate-900">{value}</p>
        {subValue && (
          <p className="text-sm text-slate-500 font-medium">{subValue}</p>
        )}
      </div>
    </div>
  );
}

function FiXCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="15" y1="9" x2="9" y2="15"></line>
      <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
  );
}
