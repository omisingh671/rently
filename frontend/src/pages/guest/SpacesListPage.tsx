import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { IS_PROPERTY_SPECIFIC_MODE } from "@/configs/appConfig";
import { ROUTES } from "@/configs/routePaths";
import { checkAvailability } from "@/features/availability/api";
import type {
  AvailabilityOptionGroup,
  AvailabilityOption,
  AvailabilityResult,
  ComfortFilter,
  ComfortOption,
} from "@/features/availability/domain";
import {
  createInventoryLock,
  type CreateBookingPayload,
} from "@/features/bookings/api";
import {
  saveBookingCheckoutDraft,
  toBookingCheckoutDraftLocation,
} from "@/features/bookings/bookingCheckoutDraft";
import { usePublicTenantConfig } from "@/features/public-config/hooks";
import type { PublicPropertySummary } from "@/features/public-config/types";

import { OptionGridCard } from "@/components/ui/OptionGridCard";
import { OptionStackCard } from "@/components/ui/OptionStackCard";

const comfortOptions: Array<{ value: ComfortFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];

type LayoutMode = "grid" | "stack";

const layoutPreferenceKey = "rently:availability-layout";
const initialVisibleOptionCount = 6;
const maxVisibleOptionCount = 12;
const emptyAvailabilityOptions: AvailabilityOption[] = [];

const getInitialLayoutMode = (): LayoutMode => {
  if (typeof window === "undefined") return "grid";

  const savedLayout = window.localStorage.getItem(layoutPreferenceKey);
  return savedLayout === "grid" || savedLayout === "stack"
    ? savedLayout
    : "grid";
};

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

const distanceSquared = (
  latitude: number,
  longitude: number,
  property: PublicPropertySummary,
) => {
  if (property.latitude === null || property.longitude === null) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    (property.latitude - latitude) ** 2 + (property.longitude - longitude) ** 2
  );
};

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
        left.spareCapacity - right.spareCapacity ||
        left.nightlyTotal - right.nightlyTotal ||
        left.itemCount - right.itemCount ||
        left.stayTotal - right.stayTotal,
    );

  return {
    available: options.length > 0,
    options,
  };
};

const comfortOrder: Record<ComfortOption, number> = {
  NON_AC: 0,
  AC: 1,
};

const comfortLabels: Record<ComfortOption, string> = {
  AC: "AC",
  NON_AC: "Non-AC",
};

const getTargetMix = (option: AvailabilityOption) =>
  option.items
    .map((item) => `${item.targetType}:${item.priceGuestCount}:${item.guestCount}`)
    .join("+");

const getDisplayTitle = (option: AvailabilityOption) => option.title;

const getAvailabilityGroupKey = (option: AvailabilityOption) =>
  [
    option.propertyId,
    getDisplayTitle(option),
    option.optionType,
    option.itemLabel,
    option.includedLabel,
    option.items.map((item) => item.priceGuestCount).join("+"),
    option.guestSplit,
    option.itemCount,
    getTargetMix(option),
  ].join("|");

const sortOptions = (left: AvailabilityOption, right: AvailabilityOption) =>
  left.spareCapacity - right.spareCapacity ||
  left.nightlyTotal - right.nightlyTotal ||
  left.itemCount - right.itemCount ||
  left.stayTotal - right.stayTotal ||
  comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption];

const sortGroups = (
  left: AvailabilityOptionGroup,
  right: AvailabilityOptionGroup,
) => sortOptions(left.variants[0]!, right.variants[0]!);

const groupAvailabilityOptions = (
  options: AvailabilityOption[],
): AvailabilityOptionGroup[] => {
  const groupsByKey = new Map<string, AvailabilityOptionGroup>();

  for (const option of options) {
    const groupId = getAvailabilityGroupKey(option);
    const displayTitle = getDisplayTitle(option);
    const existingGroup = groupsByKey.get(groupId);

    if (!existingGroup) {
      groupsByKey.set(groupId, {
        groupId,
        displayTitle,
        variants: [option],
      });
      continue;
    }

    const existingVariantIndex = existingGroup.variants.findIndex(
      (variant) => variant.comfortOption === option.comfortOption,
    );

    if (existingVariantIndex === -1) {
      existingGroup.variants.push(option);
      existingGroup.variants.sort(sortOptions);
      continue;
    }

    const existingVariant = existingGroup.variants[existingVariantIndex];
    if (existingVariant && option.stayTotal < existingVariant.stayTotal) {
      existingGroup.variants[existingVariantIndex] = option;
      existingGroup.variants.sort(sortOptions);
    }
  }

  return [...groupsByKey.values()].sort(sortGroups).slice(0, maxVisibleOptionCount);
};

const getDefaultComfort = (
  group: AvailabilityOptionGroup,
  comfort: ComfortFilter,
): ComfortOption => {
  if (
    comfort !== "ALL" &&
    group.variants.some((variant) => variant.comfortOption === comfort)
  ) {
    return comfort;
  }

  return [...group.variants].sort(
    (left, right) =>
      left.stayTotal - right.stayTotal ||
      comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption],
  )[0]!.comfortOption;
};

const getSelectedComfort = (
  group: AvailabilityOptionGroup,
  comfort: ComfortFilter,
  selectedComfortByGroup: Record<string, ComfortOption>,
) => {
  const selectedComfort = selectedComfortByGroup[group.groupId];

  if (
    selectedComfort &&
    group.variants.some(
      (variant) => variant.comfortOption === selectedComfort,
    )
  ) {
    return selectedComfort;
  }

  return getDefaultComfort(group, comfort);
};

const getSelectedOption = (
  group: AvailabilityOptionGroup,
  selectedComfort: ComfortOption,
): AvailabilityOption => {
  const option =
    group.variants.find((variant) => variant.comfortOption === selectedComfort) ??
    group.variants[0]!;

  return {
    ...option,
    title: group.displayTitle,
  };
};

const getPrimaryOption = (group: AvailabilityOptionGroup) => group.variants[0]!;

const getOptionSectionTitle = (option: AvailabilityOption) =>
  option.spareCapacity > 0 ? "More spacious private options" : "Best matches";

const groupVisibleOptionsForDisplay = (
  groups: AvailabilityOptionGroup[],
): Array<{ id: string; title: string; groups: AvailabilityOptionGroup[] }> => {
  const propertyIds = new Set(
    groups.map((group) => getPrimaryOption(group).propertyId),
  );

  if (propertyIds.size > 1) {
    const byProperty = new Map<string, AvailabilityOptionGroup[]>();

    for (const group of groups) {
      const option = getPrimaryOption(group);
      const propertyGroups = byProperty.get(option.propertyLabel) ?? [];
      propertyGroups.push(group);
      byProperty.set(option.propertyLabel, propertyGroups);
    }

    return [...byProperty.entries()].map(([title, propertyGroups]) => ({
      id: title,
      title,
      groups: propertyGroups,
    }));
  }

  const bySection = new Map<string, AvailabilityOptionGroup[]>();

  for (const group of groups) {
    const option = getPrimaryOption(group);
    const title = getOptionSectionTitle(option);
    const sectionGroups = bySection.get(title) ?? [];
    sectionGroups.push(group);
    bySection.set(title, sectionGroups);
  }

  return ["Best matches", "More spacious private options"]
    .map((title) => ({
      id: title,
      title,
      groups: bySection.get(title) ?? [],
    }))
    .filter((section) => section.groups.length > 0);
};

const getComfortVariants = (group: AvailabilityOptionGroup) =>
  group.variants
    .map((variant) => ({
      comfortOption: variant.comfortOption,
      label: comfortLabels[variant.comfortOption],
      priceLabel: formatPrice(variant.nightlyTotal),
    }))
    .sort(
      (left, right) =>
        comfortOrder[left.comfortOption] - comfortOrder[right.comfortOption],
    );

export default function SpacesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] =
    useState<LayoutMode>(getInitialLayoutMode);
  const [visibleOptionState, setVisibleOptionState] = useState({
    filterKey: "",
    count: initialVisibleOptionCount,
  });
  const [selectedComfortByGroup, setSelectedComfortByGroup] = useState<
    Record<string, ComfortOption>
  >({});
  const hasTriedGeoCityRef = useRef(false);
  const { data: tenantConfig } = usePublicTenantConfig();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const city = searchParams.get("city") ?? "";
  const guestsParam = Number(searchParams.get("guests"));
  const guests =
    Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : 1;
  const comfort = getInitialComfort(searchParams);
  const canCheckAvailability = isValidDateRange(from, to);
  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (tenantConfig?.properties ?? []).map((property) => property.city),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [tenantConfig?.properties],
  );

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);

      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }

      next.delete("occupancy");
      next.delete("ac");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  useEffect(() => {
    if (
      IS_PROPERTY_SPECIFIC_MODE ||
      hasTriedGeoCityRef.current ||
      city ||
      !navigator.geolocation ||
      !tenantConfig?.properties.some(
        (property) => property.latitude !== null && property.longitude !== null,
      )
    ) {
      return;
    }

    hasTriedGeoCityRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = [...tenantConfig.properties]
          .filter(
            (property) =>
              property.latitude !== null && property.longitude !== null,
          )
          .sort(
            (left, right) =>
              distanceSquared(
                position.coords.latitude,
                position.coords.longitude,
                left,
              ) -
              distanceSquared(
                position.coords.latitude,
                position.coords.longitude,
                right,
              ),
          )[0];

        if (nearest) {
          updateSearchParam("city", nearest.city);
        }
      },
      () => undefined,
      { maximumAge: 10 * 60 * 1000, timeout: 5000 },
    );
  }, [city, tenantConfig?.properties, updateSearchParam]);

  const availabilityQuery = useQuery<AvailabilityResult, Error>({
    queryKey: PUBLIC_QUERY_KEYS.availability.byCriteria({
      checkIn: from,
      checkOut: to,
      guests,
      comfort,
      city: IS_PROPERTY_SPECIFIC_MODE ? undefined : city || undefined,
    }),
    queryFn: async () => {
      const scopedCity = !IS_PROPERTY_SPECIFIC_MODE && city ? { city } : {};

      if (comfort === "ALL") {
        const results = await Promise.all(
          (["AC", "NON_AC"] satisfies ComfortOption[]).map((comfortOption) =>
            checkAvailability({
              checkIn: from,
              checkOut: to,
              guests,
              comfortOption,
              ...scopedCity,
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
        ...scopedCity,
      });
    },
    enabled: canCheckAvailability,
    retry: false,
  });

  const clearFilters = () => {
    setBookingError(null);
    setSearchParams({}, { replace: true });
  };

  const bookOption = async (option: AvailabilityOption) => {
    if (!canCheckAvailability) return;

    const payload = {
      bookingOptionId: option.optionId,
      propertyId: option.propertyId,
      from,
      to,
      guests,
      comfortOption: option.comfortOption,
    } satisfies CreateBookingPayload;

    try {
      const lock = await createInventoryLock(payload);
      const saved = saveBookingCheckoutDraft({
        payload: {
          ...payload,
          inventoryLockToken: lock.lockToken,
        },
        returnTo: toBookingCheckoutDraftLocation(location),
        summary: {
          title: option.title,
          spaceName: option.title,
          from,
          to,
          guestCount: guests,
          comfortOption: option.comfortOption,
          nightlyTotal: option.nightlyTotal,
          stayTotal: option.stayTotal,
        },
      });

      if (!saved) {
        setBookingError("Could not start checkout. Please try again.");
        return;
      }

      setBookingError(null);
      navigate(ROUTES.BOOKING_CHECKOUT);
    } catch {
      setBookingError("Selected stay is no longer available. Please refresh.");
    }
  };

  const options = availabilityQuery.data?.options ?? emptyAvailabilityOptions;
  const optionGroups = useMemo(
    () => groupAvailabilityOptions(options),
    [options],
  );
  const availabilityFilterKey = [from, to, city, guests, comfort].join("|");
  const visibleOptionCount =
    visibleOptionState.filterKey === availabilityFilterKey
      ? visibleOptionState.count
      : initialVisibleOptionCount;
  const visibleOptionGroups = optionGroups.slice(0, visibleOptionCount);
  const canShowMoreOptions = optionGroups.length > visibleOptionCount;
  const visibleSections = useMemo(
    () => groupVisibleOptionsForDisplay(visibleOptionGroups),
    [visibleOptionGroups],
  );
  const canShowAvailabilitySummary =
    canCheckAvailability &&
    !availabilityQuery.isFetching &&
    !availabilityQuery.isError &&
    options.length > 0;

  const updateLayoutMode = (nextLayoutMode: LayoutMode) => {
    setLayoutMode(nextLayoutMode);
    window.localStorage.setItem(layoutPreferenceKey, nextLayoutMode);
  };

  const selectComfortVariant = (
    groupId: string,
    nextComfortOption: ComfortOption,
  ) => {
    setSelectedComfortByGroup((current) => ({
      ...current,
      [groupId]: nextComfortOption,
    }));
  };

  return (
    <section className="section bg-indigo-50">
      <div className="container">
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
          {/* Header Part with Background */}
          <div className="relative bg-slate-900 px-6 py-10 md:px-10">
            {/* Background Image & Overlay */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
              style={{ backgroundImage: 'url("/assets/images/auth-bg.jpg")' }}
            />
            <div className="absolute inset-0 bg-linear-to-r from-slate-900 via-slate-900/60 to-transparent" />

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
            <div className="flex flex-col lg:flex-row lg:items-end gap-4 w-full">
              {/* Left Side: Filter Fields + Clear Button */}
              <div
                className={`flex-1 grid gap-4 items-end sm:grid-cols-2 ${
                  !IS_PROPERTY_SPECIFIC_MODE
                    ? "lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr_auto]"
                    : "lg:grid-cols-[1fr_1fr_0.8fr_1.2fr_auto]"
                }`}
              >
                {!IS_PROPERTY_SPECIFIC_MODE && (
                  <label className="block sm:col-span-2 lg:col-span-1">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      City
                    </span>
                    <select
                      value={city}
                      onChange={(event) =>
                        updateSearchParam("city", event.target.value)
                      }
                      className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">All cities</option>
                      {cityOptions.map((cityOption) => (
                        <option key={cityOption} value={cityOption}>
                          {cityOption}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
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

                {searchParams.toString() && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="hidden lg:inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-400 w-full"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Mobile Buttons: Clear + Check side-by-side */}
              <div className="w-full lg:hidden flex gap-3 mt-2">
                {searchParams.toString() ? (
                  <>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="flex-1 h-11 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-400"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      disabled={
                        !canCheckAvailability || availabilityQuery.isFetching
                      }
                      onClick={() => void availabilityQuery.refetch()}
                      className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiSearch />
                      {availabilityQuery.isFetching ? "Checking..." : "Check"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={
                      !canCheckAvailability || availabilityQuery.isFetching
                    }
                    onClick={() => void availabilityQuery.refetch()}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiSearch />
                    {availabilityQuery.isFetching ? "Checking..." : "Check"}
                  </button>
                )}
              </div>

              {/* Right Side: Check Button (Desktop) */}
              <div className="hidden lg:block w-full lg:w-auto">
                <button
                  type="button"
                  disabled={
                    !canCheckAvailability || availabilityQuery.isFetching
                  }
                  onClick={() => void availabilityQuery.refetch()}
                  className="inline-flex h-11 w-full lg:w-auto items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-6 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FiSearch />
                  {availabilityQuery.isFetching ? "Checking..." : "Check"}
                </button>
              </div>
            </div>

            {canShowAvailabilitySummary && (
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Available Options
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    {optionGroups.length} package
                    {optionGroups.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => updateLayoutMode("grid")}
                    className={`rounded-md p-1.5 transition ${layoutMode === "grid" ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                    aria-label="Grid layout"
                  >
                    <FiGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLayoutMode("stack")}
                    className={`rounded-md p-1.5 transition ${layoutMode === "stack" ? "bg-slate-100 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"}`}
                    aria-label="Stack layout"
                  >
                    <FiList className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
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
          <div className="space-y-6">
            <div className="space-y-6">
              {visibleSections.map((section) => (
                <section key={section.id}>
                  <h3 className="mb-3 flex items-center gap-3 px-1 text-sm font-bold uppercase tracking-wide text-slate-500">
                    <span className="shrink-0">{section.title}</span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </h3>
                  <div
                    className={
                      layoutMode === "grid"
                        ? "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]"
                        : "flex flex-col gap-4"
                    }
                  >
                    {section.groups.map((group) => {
                      const selectedComfort = getSelectedComfort(
                        group,
                        comfort,
                        selectedComfortByGroup,
                      );
                      const selectedOption = getSelectedOption(
                        group,
                        selectedComfort,
                      );
                      const comfortVariants = getComfortVariants(group);

                      return layoutMode === "grid" ? (
                        <OptionGridCard
                          key={group.groupId}
                          option={selectedOption}
                          comfortVariants={comfortVariants}
                          selectedComfort={selectedComfort}
                          onSelectComfort={(nextComfortOption) =>
                            selectComfortVariant(
                              group.groupId,
                              nextComfortOption,
                            )
                          }
                          onBook={bookOption}
                          isBooking={false}
                          formatPrice={formatPrice}
                        />
                      ) : (
                        <OptionStackCard
                          key={group.groupId}
                          option={selectedOption}
                          comfortVariants={comfortVariants}
                          selectedComfort={selectedComfort}
                          onSelectComfort={(nextComfortOption) =>
                            selectComfortVariant(
                              group.groupId,
                              nextComfortOption,
                            )
                          }
                          onBook={bookOption}
                          isBooking={false}
                          formatPrice={formatPrice}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            {canShowMoreOptions && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleOptionState({
                      filterKey: availabilityFilterKey,
                      count: maxVisibleOptionCount,
                    })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  Show more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
