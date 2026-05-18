import { HiChevronDown } from "react-icons/hi2";
import { useCurrentProperty } from "../hooks/useCurrentProperty";

export default function CurrentPropertySwitcher() {
  const {
    properties,
    selectedPropertyId,
    setSelectedPropertyId,
    isLoading,
    isError,
  } = useCurrentProperty();

  if (isError) {
    return (
      <div className="hidden min-w-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 lg:block">
        Property unavailable
      </div>
    );
  }

  if (!isLoading && properties.length === 0) {
    return (
      <div className="hidden min-w-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 sm:block">
        No accessible properties
      </div>
    );
  }

  return (
    <label className="relative hidden min-w-[220px] max-w-[340px] sm:block">
      <span className="sr-only">Current Property</span>
      <select
        value={selectedPropertyId}
        disabled={isLoading || properties.length === 0}
        onChange={(event) => setSelectedPropertyId(event.target.value || null)}
        className="h-10 w-full appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        title="Current Property"
      >
        <option value="">
          {isLoading ? "Current Property: Loading..." : "Current Property"}
        </option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            Current Property: {property.name}
          </option>
        ))}
      </select>
      <HiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}
