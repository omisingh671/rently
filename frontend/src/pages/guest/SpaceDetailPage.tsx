import React, { useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  FiArrowLeft,
  FiCalendar,
  FiCreditCard,
  FiHome,
  FiMapPin,
  FiUsers,
  FiWind,
} from "react-icons/fi";

import { ROUTES } from "@/configs/routePaths";
import type { CreateBookingPayload } from "@/features/bookings/api";
import {
  saveBookingCheckoutDraft,
  toBookingCheckoutDraftLocation,
} from "@/features/bookings/bookingCheckoutDraft";
import { useSpace } from "@/features/spaces/hooks";
import type { ComfortOption } from "@/features/bookings/types";

function isoDateLocal(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toISOString();
}

function daysBetween(startIso: string, endIso: string) {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

const isComfortOption = (value: string | null): value is ComfortOption =>
  value === "AC" || value === "NON_AC";

const getInitialComfortOption = (
  searchParams: URLSearchParams,
): ComfortOption => {
  const comfort = searchParams.get("comfort");
  if (isComfortOption(comfort)) return comfort;

  return searchParams.get("ac") === "true" ? "AC" : "NON_AC";
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function SpaceDetailPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const spaceQuery = useSpace(id);

  const [from, setFrom] = useState<string>(searchParams.get("from") ?? "");
  const [to, setTo] = useState<string>(searchParams.get("to") ?? "");
  const [comfortOption, setComfortOption] = useState<ComfortOption>(
    getInitialComfortOption(searchParams),
  );
  const guestsParam = Number(searchParams.get("guests"));
  const guests =
    Number.isInteger(guestsParam) && guestsParam > 0 ? guestsParam : 1;
  const [formError, setFormError] = useState<string | null>(null);
  const space = spaceQuery.data;
  const backToSpacesHref = searchParams.toString()
    ? `${ROUTES.SPACES}?${searchParams.toString()}`
    : ROUTES.SPACES;

  const computedNights = useMemo(() => {
    if (!space || !from || !to) return 0;

    try {
      const fromIso = isoDateLocal(from);
      const toIso = isoDateLocal(to);
      return daysBetween(fromIso, toIso);
    } catch {
      return 0;
    }
  }, [from, space, to]);

  const computedTotalPrice = space ? computedNights * space.pricePerNight : 0;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!id || !space) return;

    if (!from || !to) {
      setFormError("Please select check-in and check-out dates.");
      return;
    }

    const fromIso = isoDateLocal(from);
    const toIso = isoDateLocal(to);

    if (new Date(toIso) <= new Date(fromIso)) {
      setFormError("Check-out must be after check-in.");
      return;
    }

    const payload = {
      bookingType: "SINGLE_TARGET",
      spaceId: id,
      from: fromIso,
      to: toIso,
      guests,
      comfortOption,
    } satisfies CreateBookingPayload;

    const saved = saveBookingCheckoutDraft({
      payload,
      returnTo: toBookingCheckoutDraftLocation(location),
      summary: {
        title: space.title,
        spaceName: space.title,
        from,
        to,
        guestCount: guests,
        comfortOption,
        nightlyTotal: space.pricePerNight,
        stayTotal: computedTotalPrice,
      },
    });

    if (!saved) {
      setFormError("Could not start checkout. Please try again.");
      return;
    }

    setFormError(null);
    navigate(ROUTES.BOOKING_CHECKOUT);
  };

  if (spaceQuery.status === "pending") {
    return (
      <section className="section bg-surface">
        <div className="container">
          <div className="mb-5 h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
            <div className="h-80 animate-pulse rounded-2xl bg-white" />
          </div>
        </div>
      </section>
    );
  }

  if (spaceQuery.status === "error") {
    return (
      <section className="section bg-surface">
        <div className="container">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-danger">
            Error: {spaceQuery.error?.message}
          </div>
        </div>
      </section>
    );
  }

  if (!space) {
    return (
      <section className="section bg-surface">
        <div className="container">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-muted">
            Space not found.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section bg-surface">
      <div className="container">
        <Link
          to={backToSpacesHref}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 transition hover:text-indigo-900"
        >
          <FiArrowLeft />
          Back to spaces
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <FiUsers />
                Priced for {space.guestCount} guest
                {space.guestCount === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <FiHome />
                {space.targetType === "UNIT" ? "Unit" : "Room"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <FiWind />
                {space.comfortOption === "AC" ? "AC" : "Non-AC"}
              </span>
            </div>

            <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-slate-900">
              {space.title}
            </h1>

            {space.location && (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <FiMapPin className="shrink-0" />
                {space.location}
              </p>
            )}

            {space.description && (
              <p className="mt-6 max-w-3xl text-base leading-7 text-slate-600">
                {space.description}
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Capacity
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900">
                  {space.capacity} / requested {guests}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Listed type
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900">
                  {space.comfortOption === "AC" ? "AC" : "Non-AC"}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Price
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900">
                  {formatPrice(space.pricePerNight)}
                </div>
                <div className="text-xs text-muted">per night</div>
              </div>
            </div>
          </div>

          <aside className="h-max rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <FiCalendar />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Book this space
                </h2>
                <p className="text-sm text-muted">Confirm your stay dates.</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Comfort
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["NON_AC", "Non-AC"],
                    ["AC", "AC"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setComfortOption(value as ComfortOption);
                        setFormError(null);
                      }}
                      className={`h-11 rounded-lg border px-3 text-sm font-semibold transition ${
                        comfortOption === value
                          ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Check-in
                  </span>
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setFormError(null);
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Check-out
                  </span>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setFormError(null);
                    }}
                    className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </label>
              </div>

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Estimated total
                    </div>
                    <div className="mt-1 text-xs text-slate-600">
                      {computedNights > 0
                        ? `${computedNights} night${
                            computedNights === 1 ? "" : "s"
                          }`
                        : "Select dates"}
                    </div>
                  </div>
                  <div className="text-right text-xl font-semibold text-slate-900">
                    {formatPrice(computedTotalPrice)}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  Final total is calculated by the server when you book.
                </p>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-danger">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95"
                >
                  <FiCreditCard />
                  Continue
                </button>

                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setFormError(null);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </aside>
        </div>
      </div>
    </section>
  );
}
