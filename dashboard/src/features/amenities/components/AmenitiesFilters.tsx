import type { AdminProperty } from "@/features/properties/types";
import Button from "@/components/ui/Button";
import { HiChevronDown, HiXMark } from "react-icons/hi2";

type Props = {
  properties: AdminProperty[];
  propertyId: string;
  search: string;
  isActive: "" | "true" | "false";
  onChange: (next: {
    propertyId: string;
    search: string;
    isActive: "" | "true" | "false";
  }) => void;
};

export default function AmenitiesFilters({
  properties,
  propertyId,
  search,
  isActive,
  onChange,
}: Props) {
  const hasFilters = !!search || !!isActive;

  const clearFilters = () => {
    onChange({ propertyId, search: "", isActive: "" });
  };

  const controlBase =
    "relative py-1 rounded-md text-sm bg-white text-slate-700 transition border border-slate-300 focus-within:ring-2 focus-within:ring-slate-300";

  return (
    <div className="flex flex-wrap items-center gap-3 flex-1">
      <div className={`${controlBase} w-64`}>
        <select
          value={propertyId}
          onChange={(e) =>
            onChange({
              propertyId: e.target.value,
              search,
              isActive,
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">Select property</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>

        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      {/* Search */}
      <div className={controlBase}>
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) =>
            onChange({
              propertyId,
              search: e.target.value,
              isActive,
            })
          }
          className="h-8 min-w-44 px-3 outline-none"
        />
      </div>

      {/* Active filter */}
      <div className={`${controlBase} w-40`}>
        <select
          value={isActive}
          onChange={(e) =>
            onChange({
              propertyId,
              search,
              isActive: e.target.value as "" | "true" | "false",
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">All statuses</option>
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>

        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      {hasFilters && (
        <Button
          onClick={clearFilters}
          variant="dark"
          icon={<HiXMark className="h-4 w-4" />}
          className="h-[42px]"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
