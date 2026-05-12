import { useEffect } from "react";
import type { UnitStatus } from "../types";
import type { AdminProperty } from "@/features/admin/properties/types";

import Button from "@/components/ui/Button";
import { HiChevronDown, HiXMark } from "react-icons/hi2";

type Props = {
  properties: AdminProperty[];
  propertyId: string;
  search: string;
  status: UnitStatus | "";
  isActive: "" | "true" | "false";

  onChange: (next: {
    propertyId: string;
    search: string;
    status: UnitStatus | "";
    isActive: "" | "true" | "false";
  }) => void;
};

export default function UnitsFilters({
  properties,
  propertyId,
  search,
  status,
  isActive,
  onChange,
}: Props) {
  const hasFilters = !!search || !!status || !!isActive;

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      onChange({
        propertyId: properties[0].id,
        search,
        status,
        isActive,
      });
    }
  }, [propertyId, properties, search, status, isActive, onChange]);

  const clearFilters = () => {
    onChange({
      propertyId,
      search: "",
      status: "",
      isActive: "",
    });
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
              status,
              isActive,
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">Select property</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      <div className={controlBase}>
        <input
          type="text"
          placeholder="Search by unit number"
          value={search}
          onChange={(e) =>
            onChange({
              propertyId,
              search: e.target.value,
              status,
              isActive,
            })
          }
          className="h-8 min-w-44 px-3 outline-none"
        />
      </div>

      <div className={`${controlBase} w-44`}>
        <select
          value={status}
          onChange={(e) =>
            onChange({
              propertyId,
              search,
              status: e.target.value as UnitStatus | "",
              isActive,
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>

        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      <div className={`${controlBase} w-40`}>
        <select
          value={isActive}
          onChange={(e) =>
            onChange({
              propertyId,
              search,
              status,
              isActive: e.target.value as "" | "true" | "false",
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">All</option>
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
