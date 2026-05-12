import { useState } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useCreateBooking } from "@/features/bookings/hooks";
import type { AvailabilityNavigationState } from "@/features/availability/types";
import { ROUTES } from "@/configs/routePaths";

export default function AvailabilityResultPage() {
  const bookingMutation = useCreateBooking();
  const navigate = useNavigate();
  const location = useLocation();

  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const isAuthenticated = useAuthStore((s) => !!s.accessToken && !!s.user);

  const state = location.state as AvailabilityNavigationState | null;
  if (!state) {
    return <Navigate to={ROUTES.HOME} replace />;
  }
  const { criteria, availability } = state;
  if (!availability || availability.spaces.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-xl font-semibold mb-2">No spaces available</h2>
        <p className="text-muted mb-4">
          Try different dates or adjust the number of guests.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 border rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Available Spaces</h1>

      {authNotice && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          {authNotice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {availability.spaces.map((space) => (
          <div
            key={space.spaceId}
            className="rounded border bg-white shadow-sm p-4 flex flex-col"
          >
            {/* Image placeholder */}
            <div className="h-40 bg-slate-200 rounded mb-3" />

            <div className="flex-1">
              <div className="text-lg font-medium">{space.title}</div>

              {space.location && (
                <div className="text-sm text-muted mt-1">{space.location}</div>
              )}

              <div className="mt-2 text-sm">
                Total price:&nbsp;
                <span className="font-semibold">₹{space.priceTotal}</span>
              </div>
            </div>

            <button
              className="mt-4 px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-70 cursor-pointer"
              disabled={bookingMutation.isPending}
              onClick={async () => {
                if (!isAuthenticated) {
                  setAuthNotice("You are not logged in. Redirecting to login…");

                  setTimeout(() => {
                    navigate(ROUTES.LOGIN, {
                      state: { from: location },
                      replace: true,
                    });
                  }, 1200);

                  return;
                }
                const booking = await bookingMutation.mutateAsync({
                  bookingType: "SINGLE_TARGET",
                  spaceId: space.spaceId,
                  from: new Date(criteria.checkIn).toISOString(),
                  to: new Date(criteria.checkOut).toISOString(),
                  guests: criteria.guests,
                });
                navigate(ROUTES.BOOKING_PAYMENT(booking.id), { replace: true });
              }}
            >
              {bookingMutation.isPending ? "Booking…" : "Book Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
