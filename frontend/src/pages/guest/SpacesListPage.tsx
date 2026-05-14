import { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiCalendar,
  FiSearch,
  FiUsers,
  FiWind,
  FiGrid,
  FiList,
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

import { OptionGridCard } from "@/components/ui/OptionGridCard";
import { OptionStackCard } from "@/components/ui/OptionStackCard";

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
  const [layoutMode, setLayoutMode] = useState<"grid" | "stack">("stack");

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
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {/* Header Part with Background */}
          <div className="relative bg-slate-900 px-6 py-10 md:px-10">
            {/* Background Image & Overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
              style={{ backgroundImage: 'url("/assets/images/auth-bg.jpg")' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/60 to-transparent" />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                <FiCalendar className="text-indigo-300" /> Stay dates
              </span>
              <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                Find Your Stay
              </h1>
              <p className="mt-2 max-w-xl text-base text-slate-200">
                Choose dates, guests, and comfort. We will show simple bookable
                options without room numbers or internal rate names.
              </p>
            </div>
          </div>

          {/* Filters Part */}
          <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:w-full lg:grid-cols-[1fr_1fr_0.8fr_1.2fr_auto_auto] xl:w-full">
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
              className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1 lg:col-span-1"
            >
              <FiSearch />
              {availabilityQuery.isFetching ? "Checking..." : "Check"}
            </button>

            {searchParams.toString() && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-400 sm:col-span-1 lg:col-span-1"
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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-semibold text-slate-900">Available Options</h2>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={`rounded-md p-1.5 transition ${layoutMode === "grid" ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                  aria-label="Grid layout"
                >
                  <FiGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("stack")}
                  className={`rounded-md p-1.5 transition ${layoutMode === "stack" ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                  aria-label="Stack layout"
                >
                  <FiList className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className={layoutMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-4" : "flex flex-col gap-4"}>
              {options.map((option) =>
                layoutMode === "grid" ? (
                  <OptionGridCard
                    key={option.optionId}
                    option={option}
                    onBook={bookOption}
                    isBooking={createBookingMutation.isPending}
                    formatPrice={formatPrice}
                  />
                ) : (
                  <OptionStackCard
                    key={option.optionId}
                    option={option}
                    onBook={bookOption}
                    isBooking={createBookingMutation.isPending}
                    formatPrice={formatPrice}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
