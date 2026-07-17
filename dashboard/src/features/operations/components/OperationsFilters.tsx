import Button from "@/components/ui/Button";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import PropertySearchSelect from "@/features/properties/components/PropertySearchSelect";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { FiChevronDown } from "react-icons/fi";

const { FiClipboard, FiFilter, FiPlus, FiSearch } = ICON_REGISTRY;

type OperationsFiltersProps = {
  module: "bookings" | "enquiries" | "quotes";
  search: string;
  status: string;
  source: string;
  statuses: readonly string[];
  enquirySources: ReadonlyArray<{ value: string; label: string }>;
  selectedPropertyId: string;
  selectedPropertyName?: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onPropertyChange: (value: string | null) => void;
};

export function OperationsFilters({
  module,
  search,
  status,
  source,
  statuses,
  enquirySources,
  selectedPropertyId,
  selectedPropertyName,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onPropertyChange,
}: OperationsFiltersProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
      <div className="relative flex-1 lg:max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={`Search ${module}...`}
          className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
        />
      </div>

      <div className="hidden h-6 w-px bg-slate-200 lg:block" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
        <PropertySearchSelect
          className="lg:w-72"
          selectedPropertyId={selectedPropertyId}
          selectedPropertyName={selectedPropertyName}
          onChange={(value) => onPropertyChange(value || null)}
        />

        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
            className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
          >
            <option value="">All statuses</option>
            {statuses.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {formatEnumLabel(statusOption)}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {module === "enquiries" && (
          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={source}
              onChange={(event) => onSourceChange(event.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
            >
              <option value="">All sources</option>
              {enquirySources.map((sourceOption) => (
                <option key={sourceOption.value} value={sourceOption.value}>
                  {sourceOption.label}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        )}
      </div>

      {module === "bookings" && (
        <div className="flex items-center gap-3 lg:ml-auto">
          <div className="mr-1 hidden h-6 w-px bg-slate-200 lg:block" />
          <Button
            size="md"
            variant="secondary"
            icon={<FiClipboard />}
            to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
          >
            Room board
          </Button>
          <Button
            size="md"
            variant="dark"
            icon={<FiPlus />}
            to={adminPath(ADMIN_ROUTES.WALK_IN_BOOKING)}
          >
            Walk-in
          </Button>
        </div>
      )}
    </div>
  );
}
