import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminProperties, fetchPropertyById } from "../api";
import { ADMIN_KEYS } from "@/features/config/adminKeys";

type Props = {
  selectedPropertyId: string;
  selectedPropertyName?: string;
  onChange: (propertyId: string) => void;
  allowAll?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function PropertySearchSelect({
  selectedPropertyId,
  selectedPropertyName,
  onChange,
  allowAll = false,
  disabled = false,
  className,
}: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const optionsQuery = useQuery({
    queryKey: [...ADMIN_KEYS.properties.all(), "search-options", search],
    queryFn: () =>
      fetchAdminProperties(1, 25, {
        isActive: true,
        ...(search.trim() && { search: search.trim() }),
      }),
    enabled: open,
    staleTime: 60_000,
  });
  const selectedQuery = useQuery({
    queryKey: [...ADMIN_KEYS.properties.all(), "selected-option", selectedPropertyId],
    queryFn: () => fetchPropertyById(selectedPropertyId),
    enabled: Boolean(selectedPropertyId && !selectedPropertyName),
    staleTime: 5 * 60_000,
  });
  const selectedLabel =
    selectedPropertyName ?? selectedQuery.data?.name ?? "Select property";

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        type="search"
        value={open ? search : selectedPropertyId ? selectedLabel : allowAll ? "All properties" : ""}
        placeholder="Search properties"
        disabled={disabled}
        onFocus={() => {
          setSearch("");
          setOpen(true);
        }}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100"
      />
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          {allowAll && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="block w-full rounded px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              All properties
            </button>
          )}
          {optionsQuery.isFetching ? (
            <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>
          ) : (optionsQuery.data?.items ?? []).length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">No properties found.</div>
          ) : (
            (optionsQuery.data?.items ?? []).map((property) => (
              <button
                key={property.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(property.id);
                  setOpen(false);
                }}
                className="block w-full rounded px-3 py-2 text-left hover:bg-slate-100"
              >
                <span className="block text-sm font-semibold text-slate-800">{property.name}</span>
                <span className="block text-xs text-slate-500">{property.city}, {property.state}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
