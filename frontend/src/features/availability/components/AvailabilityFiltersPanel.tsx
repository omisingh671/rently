import { FiSearch, FiUsers, FiWind } from "react-icons/fi";

import type { ComfortFilter } from "../domain";

const comfortOptions: Array<{ value: ComfortFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "AC", label: "AC" },
  { value: "NON_AC", label: "Non-AC" },
];

type AvailabilityFilterKey =
  | "city"
  | "from"
  | "to"
  | "guests"
  | "comfort";

type AvailabilityFiltersPanelProps = {
  showCityFilter: boolean;
  cityOptions: string[];
  city: string;
  from: string;
  to: string;
  guests: number;
  comfort: ComfortFilter;
  hasActiveFilters: boolean;
  canCheckAvailability: boolean;
  isChecking: boolean;
  onFilterChange: (key: AvailabilityFilterKey, value: string) => void;
  onClear: () => void;
  onCheck: () => void;
};

export default function AvailabilityFiltersPanel({
  showCityFilter,
  cityOptions,
  city,
  from,
  to,
  guests,
  comfort,
  hasActiveFilters,
  canCheckAvailability,
  isChecking,
  onFilterChange,
  onClear,
  onCheck,
}: AvailabilityFiltersPanelProps) {
  const checkDisabled = !canCheckAvailability || isChecking;

  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-end">
      <div
        className={`grid flex-1 items-end gap-4 sm:grid-cols-2 ${
          showCityFilter
            ? "lg:grid-cols-[1.2fr_1fr_1fr_0.8fr_1.2fr_auto]"
            : "lg:grid-cols-[1fr_1fr_0.8fr_1.2fr_auto]"
        }`}
      >
        {showCityFilter && (
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              City
            </span>
            <select
              value={city}
              onChange={(event) =>
                onFilterChange("city", event.target.value)
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
              onFilterChange("from", event.target.value)
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
            onChange={(event) => onFilterChange("to", event.target.value)}
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
              onFilterChange("guests", event.target.value)
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
              onFilterChange("comfort", event.target.value)
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="hidden h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 lg:inline-flex"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-2 flex w-full gap-3 lg:hidden">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          disabled={checkDisabled}
          onClick={onCheck}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiSearch />
          {isChecking ? "Checking..." : "Check"}
        </button>
      </div>

      <div className="hidden w-full lg:block lg:w-auto">
        <button
          type="button"
          disabled={checkDisabled}
          onClick={onCheck}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[rgb(var(--primary)/1)] px-6 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
        >
          <FiSearch />
          {isChecking ? "Checking..." : "Check"}
        </button>
      </div>
    </div>
  );
}
