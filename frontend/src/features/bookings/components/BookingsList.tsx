import {
  FiCalendar,
  FiUsers,
  FiTag,
  FiInfo,
  FiCreditCard,
  FiXCircle,
  FiActivity,
} from "react-icons/fi";

import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";
import { normalizeApiError } from "@/utils/errors";
import { useCancelBooking } from "../hooks";
import type { Booking } from "../types";

const bookingStatusMap: Record<Booking["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-indigo-100 text-indigo-700",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

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

type BookingsListProps = {
  bookings: Booking[];
};

const getStayLabel = (booking: Booking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-Room Stay`;
  }

  if (booking.title.startsWith("Booking option - ")) {
    const target = booking.spaceName.toLowerCase();
    if (target.includes("unit")) return "Private Unit Stay";
    if (target.includes("room")) return "Room Stay";
  }

  return booking.title.replace(/^Booking option - /, "");
};

const getBookingItemLabel = (
  item: Booking["items"][number],
  index: number,
  totalItems: number,
) => {
  if (totalItems > 1) {
    return item.targetType === "UNIT" ? `Unit ${index + 1}` : `Room ${index + 1}`;
  }

  return item.targetLabel.replace(/^Booking option - /, "");
};

export default function BookingsList({ bookings }: BookingsListProps) {
  const cancelBooking = useCancelBooking();

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FiActivity className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-slate-900">No bookings found</h3>
        <p className="mt-1 text-sm text-slate-500">When you book a stay, it will appear here.</p>
        <Button to={ROUTES.SPACES} className="mt-6" variant="primary" size="sm">
          Browse Availability
        </Button>
      </div>
    );
  }

  const requestCancellation = (booking: Booking) => {
    const reason = window.prompt(
      "Reason for cancellation",
      booking.cancellationReason ?? "",
    );

    if (reason === null) return;

    void cancelBooking.mutateAsync({
      bookingId: booking.id,
      reason: reason.trim() || undefined,
    });
  };

  const cancelError = cancelBooking.error
    ? normalizeApiError(cancelBooking.error).message
    : null;

  return (
    <div className="space-y-5">
      {cancelError && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 flex items-start gap-3">
          <FiInfo className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{cancelError}</p>
        </div>
      )}

      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {getStayLabel(booking)}
                </h3>
                <StatusBadge
                  status={booking.status}
                  variantMap={bookingStatusMap}
                  className="rounded-full px-3 py-1 shadow-sm"
                />
              </div>

              <div className="mt-4 grid gap-y-3 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <FiTag className="h-4 w-4 text-slate-400" />
                  <span className="font-medium text-slate-500">Ref:</span>
                  <span className="font-semibold text-slate-900">{booking.bookingRef}</span>
                </div>

                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <FiCalendar className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {formatDate(booking.from)} - {formatDate(booking.to)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <FiUsers className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">{booking.guestCount} Guests</span>
                  <span className="mx-1.5 text-slate-300">|</span>
                  <span className="font-medium text-slate-500">{booking.comfortOption === "AC" ? "AC" : "Non-AC"}</span>
                </div>
              </div>

              {booking.items.length > 1 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {booking.items.map((item, index) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-100"
                    >
                      {getBookingItemLabel(item, index, booking.items.length)}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Actions */}
            <div className="flex flex-row items-center justify-between border-t border-slate-100 pt-6 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0 lg:pl-6 lg:border-l lg:border-slate-100 min-w-[160px]">
              <div className="lg:text-right">
                <div className="text-xl font-bold text-slate-900">
                  {formatPrice(booking.totalPrice)}
                </div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                  {formatPrice(booking.pricePerNight)} / night
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-0 lg:mt-4">
                <Button
                  to={ROUTES.BOOKING_DETAIL(booking.id)}
                  size="sm"
                  variant="secondary"
                  outline
                  className="h-9 px-4 shadow-sm"
                >
                  View Details
                </Button>

                {booking.status === "PENDING" && (
                  <Button
                    to={ROUTES.BOOKING_PAYMENT(booking.id)}
                    size="sm"
                    variant="primary"
                    className="h-9 px-4 shadow-sm"
                  >
                    <FiCreditCard className="mr-2 h-3.5 w-3.5" />
                    Pay Now
                  </Button>
                )}

                {(booking.status === "PENDING" ||
                  booking.status === "CONFIRMED") && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    outline
                    className="h-9 px-4"
                    disabled={cancelBooking.isPending}
                    onClick={() => requestCancellation(booking)}
                  >
                    <FiXCircle className="mr-2 h-3.5 w-3.5" />
                    Cancel
                  </Button>
                )}


                {booking.cancelledAt && (
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                    <FiXCircle className="h-3 w-3" />
                    Cancelled {formatDate(booking.cancelledAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
