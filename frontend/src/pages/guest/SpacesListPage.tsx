import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiCalendar,
  FiHome,
  FiMapPin,
  FiSearch,
  FiSliders,
  FiUsers,
  FiWind,
} from "react-icons/fi";

import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import { checkAvailability } from "@/features/availability/api";
import type { AvailabilityResult } from "@/features/availability/domain";
import { useSpaces } from "@/features/spaces/hooks";
import type { Space } from "@/features/spaces/types";

type OccupancyFilter = "all" | "single" | "double" | "unit";
type ClimateFilter = "all" | "ac" | "non-ac";

const occupancyOptions: Array<{
  value: OccupancyFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All spaces",
    description: "Rooms and full units",
  },
  {
    value: "single",
    label: "Single occupancy",
    description: "Private room for one guest",
  },
  {
    value: "double",
    label: "Double occupancy",
    description: "Room for two guests",
  },
  {
    value: "unit",
    label: "Full unit",
    description: "Complete apartment/unit",
  },
];

const climateOptions: Array<{
  value: ClimateFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All room types",
    description: "Show AC and non-AC spaces",
  },
  {
    value: "ac",
    label: "AC",
    description: "Air-conditioned spaces only",
  },
  {
    value: "non-ac",
    label: "Non-AC",
    description: "Naturally ventilated spaces",
  },
];

const isOccupancyFilter = (value: string | null): value is OccupancyFilter =>
  value === "all" ||
  value === "single" ||
  value === "double" ||
  value === "unit";

const getClimateFilter = (value: string | null): ClimateFilter => {
  if (value === "true") return "ac";
  if (value === "false") return "non-ac";
  return "all";
};

const getSpaceOccupancy = (space: Space): OccupancyFilter => {
  if (space.targetType === "UNIT") return "unit";
  return space.capacity <= 1 ? "single" : "double";
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

const isValidDateRange = (from: string, to: string) =>
  Boolean(from && to) && new Date(to) > new Date(from);

export default function SpacesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useSpaces(true);

  const occupancyParam = searchParams.get("occupancy");
  const selectedOccupancy = isOccupancyFilter(occupancyParam)
    ? occupancyParam
    : "all";
  const selectedClimate = getClimateFilter(searchParams.get("ac"));
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const guestsParam = Number(searchParams.get("guests"));
  const guests = Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : 0;
  const availabilityGuests = guests || 1;
  const canCheckAvailability = isValidDateRange(from, to);
  const availabilityOccupancyKey =
    selectedOccupancy === "single" ? "single" : "double";

  const availabilityQuery = useQuery<AvailabilityResult, Error>({
    queryKey: PUBLIC_QUERY_KEYS.availability.byCriteria({
      checkIn: from,
      checkOut: to,
      guests: availabilityGuests,
      occupancy:
        selectedOccupancy === "all" && availabilityGuests === 1
          ? "all"
          : availabilityOccupancyKey,
    }),
    queryFn: async () => {
      if (selectedOccupancy === "all" && availabilityGuests === 1) {
        const [singleResult, doubleResult] = await Promise.all([
          checkAvailability({
            checkIn: from,
            checkOut: to,
            guests: availabilityGuests,
            occupancyType: "single",
          }),
          checkAvailability({
            checkIn: from,
            checkOut: to,
            guests: availabilityGuests,
            occupancyType: "double",
          }),
        ]);

        return {
          available: singleResult.available || doubleResult.available,
          spaces: [...singleResult.spaces, ...doubleResult.spaces],
        };
      }

      return checkAvailability({
        checkIn: from,
        checkOut: to,
        guests: availabilityGuests,
        occupancyType: availabilityOccupancyKey,
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

    if (key === "occupancy" && value === "all") {
      next.delete("occupancy");
    }

    setSearchParams(next, { replace: true });
  };

  const updateClimateFilter = (value: ClimateFilter) => {
    const next = new URLSearchParams(searchParams);

    if (value === "all") {
      next.delete("ac");
    } else {
      next.set("ac", value === "ac" ? "true" : "false");
    }

    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  if (query.status === "pending") {
    return (
      <section className="section bg-surface">
        <div className="container">
          <div className="text-lg font-medium mb-4">Spaces</div>
          <div>Loading spaces...</div>
        </div>
      </section>
    );
  }

  if (query.status === "error") {
    return (
      <section className="section bg-surface">
        <div className="container">
          <h1 className="text-2xl font-semibold mb-3">Spaces</h1>
          <div className="text-danger">Error: {query.error?.message}</div>
        </div>
      </section>
    );
  }

  const spaces = query.data ?? [];
  const filteredSpaces = spaces.filter((space) => {
    const matchesOccupancy =
      selectedOccupancy === "all" ||
      getSpaceOccupancy(space) === selectedOccupancy;
    const matchesClimate =
      selectedClimate === "all" ||
      (selectedClimate === "ac" ? space.hasAC : !space.hasAC);
    const matchesGuests = guests === 0 || space.capacity >= guests;

    return matchesOccupancy && matchesClimate && matchesGuests;
  });
  const selectedLabel =
    occupancyOptions.find((option) => option.value === selectedOccupancy)
      ?.label ?? "All spaces";
  const availableSpaceIds = new Set(
    availabilityQuery.data?.spaces.map((space) => space.spaceId) ?? []
  );
  const showAvailabilityState =
    canCheckAvailability && availabilityQuery.status === "success";

  const buildSpaceHref = (spaceId: string) => {
    const detailParams = new URLSearchParams();
    if (from) detailParams.set("from", from);
    if (to) detailParams.set("to", to);
    if (guests) detailParams.set("guests", String(guests));
    if (selectedOccupancy !== "all") {
      detailParams.set("occupancy", selectedOccupancy);
    }
    if (selectedClimate !== "all") {
      detailParams.set("ac", selectedClimate === "ac" ? "true" : "false");
    }

    const suffix = detailParams.toString();
    return suffix ? `/spaces/${spaceId}?${suffix}` : `/spaces/${spaceId}`;
  };

  if (spaces.length === 0) {
    return (
      <section className="section bg-surface">
        <div className="container">
          <h1 className="text-2xl font-semibold mb-3">Spaces</h1>
          <div className="text-muted">No spaces available yet.</div>
        </div>
      </section>
    );
  }

  return (
    <section className="section bg-surface">
      <div className="container">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="badge badge-primary kicker inline-flex items-center gap-2">
                <FiCalendar /> Stay dates
              </span>
              <h1 className="mt-4 text-3xl font-semibold text-slate-900">
                Available Spaces
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Choose dates, filter by occupancy, and continue with the space
                that fits your stay.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[46rem] lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
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
                  value={guests || ""}
                  placeholder="1"
                  onChange={(event) =>
                    updateSearchParam("guests", event.target.value)
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <button
                type="button"
                disabled={!canCheckAvailability || availabilityQuery.isFetching}
                onClick={() => void availabilityQuery.refetch()}
                className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 lg:col-span-1"
              >
                <FiSearch />
                {availabilityQuery.isFetching ? "Checking..." : "Check"}
              </button>

              {searchParams.toString() && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex h-11 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-400 sm:col-span-2 lg:col-span-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="h-max rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FiSliders className="text-indigo-600" />
              Filters
            </div>

            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Occupancy
            </div>
            <div className="space-y-2">
              {occupancyOptions.map((option) => {
                const selected = option.value === selectedOccupancy;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateSearchParam("occupancy", option.value)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Room type
            </div>
            <div className="space-y-2">
              {climateOptions.map((option) => {
                const selected = option.value === selectedClimate;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateClimateFilter(option.value)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-sm font-semibold">
                      {option.label}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear filters
            </button>
          </aside>

          <div>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedLabel}
                </h2>
                <p className="text-sm text-muted">
                  {filteredSpaces.length} of {spaces.length} spaces shown
                </p>
              </div>

              <div className="text-sm text-muted">
                {from && to ? `${from} to ${to}` : "Select dates to prefill booking"}
                {guests ? ` - ${guests} guest${guests === 1 ? "" : "s"}` : ""}
              </div>
            </div>

            {canCheckAvailability && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                {availabilityQuery.isFetching
                  ? "Checking availability for selected dates..."
                  : availabilityQuery.isError
                    ? `Unable to check availability: ${availabilityQuery.error.message}`
                    : "Green cards are available for selected dates. Orange cards may be booked or under maintenance."}
              </div>
            )}

            {filteredSpaces.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <h3 className="text-lg font-semibold text-slate-900">
                  No matching spaces
                </h3>
                <p className="mt-2 text-sm text-muted">
                  Try another occupancy filter or clear filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredSpaces.map((space) => {
                  const availabilityChecked = showAvailabilityState;
                  const isAvailable = availableSpaceIds.has(space.id);
                  const cardTone = !availabilityChecked
                    ? "border-slate-200 hover:border-indigo-300"
                    : isAvailable
                      ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                      : "border-orange-200 bg-orange-50/40 hover:border-orange-300";

                  return (
                    <Link
                      key={space.id}
                      to={buildSpaceHref(space.id)}
                      className={`group block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${cardTone}`}
                    >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            <FiUsers />
                            {getSpaceOccupancy(space) === "unit"
                              ? "Full unit"
                              : `${space.capacity} guest${
                                  space.capacity === 1 ? "" : "s"
                                }`}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            <FiHome />
                            {space.targetType === "UNIT" ? "Unit" : "Room"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <FiWind />
                            {space.hasAC ? "AC" : "Non-AC"}
                          </span>
                          {availabilityChecked && (
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                isAvailable
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {isAvailable ? "Available" : "Unavailable"}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-indigo-700">
                          {space.title}
                        </h3>

                        {space.location && (
                          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                            <FiMapPin className="shrink-0" />
                            {space.location}
                          </p>
                        )}

                        {space.description && (
                          <p className="mt-3 text-sm leading-relaxed text-slate-600">
                            {space.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-left sm:text-right">
                        <div className="text-lg font-semibold text-slate-900">
                          {formatPrice(space.pricePerNight)}
                        </div>
                        <div className="text-xs text-muted">per night</div>
                      </div>
                    </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
