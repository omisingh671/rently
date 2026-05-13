import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiCalendar,
  FiCheckCircle,
  FiSearch,
  FiUsers,
  FiWind,
} from "react-icons/fi";

import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import { ROUTES } from "@/configs/routePaths";
import { checkAvailability } from "@/features/availability/api";
import type {
  AvailabilityOption,
  AvailabilityResult,
  ComfortFilter,
  ComfortOption,
} from "@/features/availability/domain";
import { useCreateBooking } from "@/features/bookings/hooks";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";

const comfortOptions: Array<{ value: ComfortFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];

const isComfortFilter = (value: string | null): value is ComfortFilter =>
  value === "ALL" || value === "AC" || value === "NON_AC";

const getInitialComfort = (searchParams: URLSearchParams): ComfortFilter => {
  const comfort = searchParams.get("comfort");
  if (isComfortFilter(comfort)) return comfort;
  const legacyAc = searchParams.get("ac");
  if (legacyAc === "true") return "AC";
  if (legacyAc === "false") return "NON_AC";
  return "ALL";
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const isValidDateRange = (from: string, to: string) =>
  Boolean(from && to) && new Date(to) > new Date(from);

const mergeAvailabilityResults = (
  results: AvailabilityResult[],
): AvailabilityResult => {
  const optionsById = new Map<string, AvailabilityOption>();

  for (const result of results) {
    for (const option of result.options) {
      optionsById.set(option.optionId, option);
    }
  }

  const options = [...optionsById.values()]
    .sort(
      (left, right) =>
        left.totalCapacity - right.totalCapacity ||
        left.itemCount - right.itemCount ||
        left.stayTotal - right.stayTotal,
    )
    .slice(0, 6);

  return {
    available: options.length > 0,
    options,
  };
};

export default function SpacesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const createBookingMutation = useCreateBooking();
  const isAuthenticated = useAuthStore((state) => !!state.accessToken && !!state.user);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const guestsParam = Number(searchParams.get("guests"));
  const guests = Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : 1;
  const comfort = getInitialComfort(searchParams);
  const canCheckAvailability = isValidDateRange(from, to);

  const availabilityQuery = useQuery<AvailabilityResult, Error>({
    queryKey: PUBLIC_QUERY_KEYS.availability.byCriteria({
      checkIn: from,
      checkOut: to,
      guests,
      comfort,
    }),
    queryFn: async () => {
      if (comfort === "ALL") {
        const results = await Promise.all(
          (["AC", "NON_AC"] satisfies ComfortOption[]).map((comfortOption) =>
            checkAvailability({
              checkIn: from,
              checkOut: to,
              guests,
              comfortOption,
            }),
          ),
        );

        return mergeAvailabilityResults(results);
      }

      return checkAvailability({
        checkIn: from,
        checkOut: to,
        guests,
        comfortOption: comfort,
      });
    },
    enabled: canCheckAvailability,
    retry: false,
  });

  const updateSearchParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    next.delete("occupancy");
    next.delete("ac");
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setBookingError(null);
    setSearchParams({}, { replace: true });
  };

  const bookOption = async (option: AvailabilityOption) => {
    if (!canCheckAvailability) return;

    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN, {
        state: { from: location },
        replace: true,
      });
      return;
    }

    try {
      setBookingError(null);
      const booking = await createBookingMutation.mutateAsync({
        bookingOptionId: option.optionId,
        from,
        to,
        guests,
        comfortOption: option.comfortOption,
      });

      navigate(ROUTES.BOOKING_PAYMENT(booking.id), { replace: true });
    } catch (error: unknown) {
      setBookingError(normalizeApiError(error).message);
    }
  };

  const options = availabilityQuery.data?.options ?? [];

  return (
    <section className="section bg-surface">
      <div className="container">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <span className="badge badge-primary kicker inline-flex items-center gap-2">
                <FiCalendar /> Stay dates
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                Find Your Stay
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Choose dates, guests, and comfort. We will show simple bookable
                options without room numbers or internal rate names.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[50rem] xl:grid-cols-[1fr_1fr_0.8fr_1.2fr_auto_auto]">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) =>
                    updateSearchParam("from", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(event) =>
                    updateSearchParam("to", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FiUsers className="h-3 w-3" />
                  Guests
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={guests}
                  onChange={(event) =>
                    updateSearchParam("guests", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <FiWind className="h-3 w-3" />
                  Comfort
                </span>
                <select
                  value={comfort}
                  onChange={(event) =>
                    updateSearchParam("comfort", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {comfortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={!canCheckAvailability || availabilityQuery.isFetching}
                onClick={() => void availabilityQuery.refetch()}
                className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 xl:col-span-1"
              >
                <FiSearch />
                {availabilityQuery.isFetching ? "Checking..." : "Check"}
              </button>

              {searchParams.toString() && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-400 sm:col-span-2 xl:col-span-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {bookingError && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {bookingError}
          </div>
        )}

        {!canCheckAvailability ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              Select stay dates
            </h2>
            <p className="mt-2 text-sm text-muted">
              Enter check-in, check-out, and guest count to see booking options.
            </p>
          </div>
        ) : availabilityQuery.isFetching ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-muted">
            Checking availability for your stay...
          </div>
        ) : availabilityQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="text-lg font-semibold text-red-900">
              Unable to check availability
            </h2>
            <p className="mt-2 text-sm text-red-700">
              {availabilityQuery.error.message}
            </p>
          </div>
        ) : options.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-900">
              No booking options available
            </h2>
            <p className="mt-2 text-sm text-muted">
              Try different dates, guest count, or comfort selection.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {options.map((option) => (
              <article
                key={option.optionId}
                className="flex min-h-[18rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                      <FiCheckCircle />
                      {option.itemCount} item{option.itemCount === 1 ? "" : "s"}
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-slate-900">
                      {option.title}
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    {option.comfortOption === "AC" ? "AC" : "Non-AC"}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Guest split
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {option.guestSplit}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Capacity
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {option.totalCapacity} guests
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nightly
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {formatPrice(option.nightlyTotal)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Stay total
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {formatPrice(option.stayTotal)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={createBookingMutation.isPending}
                  onClick={() => void bookOption(option)}
                  className="mt-auto inline-flex h-11 items-center justify-center rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createBookingMutation.isPending ? "Booking..." : "Continue"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
