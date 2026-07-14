import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  FiCalendar,
  FiGrid,
  FiList,
} from "react-icons/fi";

import { PUBLIC_QUERY_KEYS } from "@/configs/publicQueryKeys";
import { IS_PROPERTY_SPECIFIC_MODE } from "@/configs/appConfig";
import { ROUTES } from "@/configs/routePaths";
import { checkAvailability } from "@/features/availability/api";
import type {
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
import AvailabilityFiltersPanel from "@/features/availability/components/AvailabilityFiltersPanel";
import AvailabilityResultsState from "@/features/availability/components/AvailabilityResultsState";
import {
  formatAvailabilityPrice,
  getComfortVariants,
  getSelectedComfort,
  getSelectedOption,
  groupAvailabilityOptions,
  groupVisibleOptionsForDisplay,
  maxVisibleOptionCount,
  mergeAvailabilityResults,
} from "@/features/availability/availabilityPresentation";

import { OptionGridCard } from "@/components/ui/OptionGridCard";
import { OptionStackCard } from "@/components/ui/OptionStackCard";

type LayoutMode = "grid" | "stack";

const layoutPreferenceKey = "rently:availability-layout";
const initialVisibleOptionCount = 6;
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
            <AvailabilityFiltersPanel
              showCityFilter={!IS_PROPERTY_SPECIFIC_MODE}
              cityOptions={cityOptions}
              city={city}
              from={from}
              to={to}
              guests={guests}
              comfort={comfort}
              hasActiveFilters={Boolean(searchParams.toString())}
              canCheckAvailability={canCheckAvailability}
              isChecking={availabilityQuery.isFetching}
              onFilterChange={updateSearchParam}
              onClear={clearFilters}
              onCheck={() => void availabilityQuery.refetch()}
            />

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

        <AvailabilityResultsState
          bookingError={bookingError}
          canCheckAvailability={canCheckAvailability}
          isFetching={availabilityQuery.isFetching}
          errorMessage={
            availabilityQuery.isError ? availabilityQuery.error.message : null
          }
          hasOptions={options.length > 0}
        />

        {canShowAvailabilitySummary && (
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
                        ? "grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,22rem),1fr))]"
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
                          formatPrice={formatAvailabilityPrice}
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
                          formatPrice={formatAvailabilityPrice}
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
