import type { AdminProperty } from "@/features/admin/properties/types";
import Button from "@/components/ui/Button";
import { HiChevronDown, HiXMark } from "react-icons/hi2";
import type { MaintenanceTargetType } from "../types";

type Props = {
  properties: AdminProperty[];
  propertyId: string;
  search: string;
  targetType: MaintenanceTargetType | "";
  onChange: (next: {
    propertyId: string;
    search: string;
    targetType: MaintenanceTargetType | "";
  }) => void;
};

const controlBase =
  "relative py-1 rounded-md text-sm bg-white text-slate-700 transition border border-slate-300 focus-within:ring-2 focus-within:ring-slate-300";

export default function MaintenanceFilters({
  properties,
  propertyId,
  search,
  targetType,
  onChange,
}: Props) {
  const hasFilters = !!search || !!targetType;

  return (
    <div className="flex flex-wrap items-center gap-3 flex-1">
      <div className={`${controlBase} w-64`}>
        <select
          value={propertyId}
          onChange={(event) =>
            onChange({
              propertyId: event.target.value,
              search,
              targetType,
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

      <div className={controlBase}>
        <input
          type="text"
          placeholder="Search reason"
          value={search}
          onChange={(event) =>
            onChange({
              propertyId,
              search: event.target.value,
              targetType,
            })
          }
          className="h-8 min-w-44 px-3 outline-none"
        />
      </div>

      <div className={`${controlBase} w-44`}>
        <select
          value={targetType}
          onChange={(event) =>
            onChange({
              propertyId,
              search,
              targetType: event.target.value as MaintenanceTargetType | "",
            })
          }
          className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
        >
          <option value="">All targets</option>
          <option value="PROPERTY">Property</option>
          <option value="UNIT">Unit</option>
          <option value="ROOM">Room</option>
        </select>
        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      </div>

      {hasFilters && (
        <Button
          onClick={() =>
            onChange({
              propertyId,
              search: "",
              targetType: "",
            })
          }
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
