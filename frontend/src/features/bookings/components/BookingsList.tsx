import { Link } from "react-router-dom";

import StatusBadge from "@/components/common/StatusBadge";
import Button from "@/components/ui/Button";
import { ROUTES } from "@/configs/routePaths";
import { normalizeApiError } from "@/utils/errors";
import { useCancelBooking } from "../hooks";
import type { Booking } from "../types";

const bookingStatusMap: Record<Booking["status"], string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const formatDate = (iso?: string) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString();
};

type BookingsListProps = {
  bookings: Booking[];
};

export default function BookingsList({ bookings }: BookingsListProps) {
  const cancelBooking = useCancelBooking();

  if (bookings.length === 0) {
    return <div className="text-slate-500">You have no bookings yet.</div>;
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
    <div className="space-y-4">
      {cancelError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {bookings.map((booking) => (
        <article
          key={booking.id}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  {booking.title}
                </h3>
                <StatusBadge
                  status={booking.status}
                  variantMap={bookingStatusMap}
                />
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Ref: {booking.bookingRef}
              </div>

              <div className="mt-2 text-sm text-slate-600">
                {booking.bookingType === "MULTI_ROOM" ? (
                  <>
                    Space:{" "}
                    <span className="font-medium text-slate-900">
                      {booking.items.length} rooms
                    </span>
                  </>
                ) : (
                  <>
                    Space:{" "}
                    <Link
                      to={ROUTES.SPACE_DETAIL(booking.spaceId)}
                      className="font-medium text-indigo-600 underline-offset-2 hover:underline"
                    >
                      {booking.spaceName}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-1 text-sm text-slate-600">
                Guests: {booking.guestCount}
                <span className="mx-2 text-slate-300">|</span>
                {booking.comfortOption === "AC" ? "AC" : "Non-AC"}
              </div>

              {booking.items.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {booking.items.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {item.targetLabel} ({item.guestCount}/{item.capacity},{" "}
                      {item.comfortOption === "AC" ? "AC" : "Non-AC"})
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-1 text-sm text-slate-600">
                {formatDate(booking.from)} to {formatDate(booking.to)}
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="md:text-right">
                <div className="font-semibold text-slate-900">
                  INR {booking.totalPrice}
                </div>
                <div className="text-xs text-slate-500">
                  INR {booking.pricePerNight} / night
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Created {formatDate(booking.createdAt)}
                </div>
              </div>

              {booking.status === "PENDING" && (
                <Button
                  to={ROUTES.BOOKING_PAYMENT(booking.id)}
                  size="sm"
                  variant="primary"
                >
                  Complete payment
                </Button>
              )}

              {(booking.status === "PENDING" ||
                booking.status === "CONFIRMED") && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  outline
                  disabled={cancelBooking.isPending}
                  onClick={() => requestCancellation(booking)}
                >
                  Cancel booking
                </Button>
              )}

              {booking.cancelledAt && (
                <div className="text-xs text-red-600">
                  Cancelled {formatDate(booking.cancelledAt)}
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
