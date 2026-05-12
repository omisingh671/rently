import { HiChevronDown, HiXMark } from "react-icons/hi2";

import Button from "@/components/ui/Button";
import type { AssignmentPropertyOption } from "./AssignmentForm/AssignmentForm";

type Props = {
  properties: AssignmentPropertyOption[];
  propertyId: string;
  onChange: (next: { propertyId: string }) => void;
};

export default function AssignmentsFilters({
  properties,
  propertyId,
  onChange,
}: Props) {
  const controlBase =
    "relative py-1 rounded-md text-sm bg-white text-slate-700 transition border border-slate-300 focus-within:ring-2 focus-within:ring-slate-300";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className={`${controlBase} w-64`}>
        <select
          value={propertyId}
          onChange={(e) => onChange({ propertyId: e.target.value })}
          className="appearance-none h-8 w-full cursor-pointer bg-transparent px-2 text-sm outline-none"
        >
          <option value="">All properties</option>
          {properties.length === 0 && (
            <option value="" disabled>
              No properties available
            </option>
          )}
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </select>

        <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {propertyId && (
        <Button
          onClick={() => onChange({ propertyId: "" })}
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
