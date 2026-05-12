import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSpace } from "@/features/spaces/hooks";
import { useCreateBooking } from "@/features/bookings/hooks";

import { normalizeApiError } from "@/utils/errors";

function isoDateLocal(dateStr: string) {
  // input type=date supplies YYYY-MM-DD — convert to ISO string at start of day
  const d = new Date(dateStr + "T00:00:00");
  return d.toISOString();
}

function daysBetween(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function SpaceDetailPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  const spaceQuery = useSpace(id);
  const createBookingMutation = useCreateBooking();

  // booking form state (simple)
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const space = spaceQuery.data;

  // auto-calc total price if both dates and pricePerNight available
  const computedTotalPrice = useMemo(() => {
    if (!space) return 0;
    if (!from || !to) return 0;
    try {
      const fromIso = isoDateLocal(from);
      const toIso = isoDateLocal(to);
      const nights = daysBetween(fromIso, toIso);
      return nights * space.pricePerNight;
    } catch {
      return 0;
    }
  }, [from, to, space]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!from || !to) {
      alert("Please select check-in and check-out dates.");
      return;
    }

    const fromIso = isoDateLocal(from);
    const toIso = isoDateLocal(to);

    if (new Date(toIso) <= new Date(fromIso)) {
      alert("Check-out must be after check-in.");
      return;
    }

    try {
      await createBookingMutation.mutateAsync({
        spaceId: id,
        from: fromIso,
        to: toIso,
      });
      // on success, navigate to bookings page
      navigate("/bookings", { replace: true });
    } catch (err: unknown) {
      const msg = normalizeApiError(err);
      console.error("Create booking failed:", msg);
      // error UI displayed below
    }
  };

  if (spaceQuery.status === "pending") {
    return <div className="p-8">Loading space…</div>;
  }

  if (spaceQuery.status === "error") {
    return (
      <div className="p-8 text-danger">Error: {spaceQuery.error?.message}</div>
    );
  }

  if (!space) {
    return <div className="p-8">Space not found.</div>;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{space.title}</h1>
      <p className="text-sm text-muted mb-4">{space.location}</p>

      <div className="bg-white/60 p-6 rounded shadow mb-6">
        <p className="mb-4">{space.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-muted">Capacity</div>
            <div className="font-medium">{space.capacity}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted">Price</div>
            <div className="font-semibold">${space.pricePerNight} / night</div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm text-muted mb-1">Check-in</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </label>

            <label className="block">
              <div className="text-sm text-muted mb-1">Check-out</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </label>
          </div>

          <label className="block">
            <div className="text-sm text-muted mb-1">Estimated total</div>
            <input
              type="number"
              value={computedTotalPrice}
              readOnly
              className="w-full px-3 py-2 border rounded"
              min={0}
            />
            <div className="text-xs text-muted mt-1">
              Final total is calculated by the server when you book.
            </div>
          </label>

          {createBookingMutation.isError && (
            <div className="text-danger">
              Error: {createBookingMutation.error?.message}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={createBookingMutation.isPending}
              className={`px-4 py-2 rounded bg-[rgb(var(--primary)/1)] text-white ${
                createBookingMutation.isPending ? "opacity-70 cursor-wait" : ""
              }`}
            >
              {createBookingMutation.isPending ? "Booking…" : "Book now"}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded border"
              onClick={() => {
                // reset form
                setFrom("");
                setTo("");
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
