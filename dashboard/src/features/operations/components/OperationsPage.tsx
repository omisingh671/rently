import { useMemo, useState } from "react";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminOperations } from "../hooks/useAdminOperations";
import type {
  BookingStatus,
  CashierSummaryResponse,
  LeadStatus,
  OperationsBoardResponse,
} from "../types";
import Pagination from "@/components/common/Pagination";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { normalizeApiError } from "@/utils/errors";
import {
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { OperationsCashierPanel } from "./OperationsCashierPanel";
import { OperationsFilters } from "./OperationsFilters";
import { OperationsImmediateAttentionPanel } from "./OperationsImmediateAttentionPanel";
import { OperationsRecordsTable } from "./OperationsRecordsTable";
import { OperationsSummaryCards } from "./OperationsSummaryCards";

const { FiHome } = ICON_REGISTRY;

type Module = "bookings" | "enquiries" | "quotes";

type Props = {
  module: Module;
};

const bookingStatuses: BookingStatus[] = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "NO_SHOW",
];

const leadStatuses: LeadStatus[] = ["NEW", "IN_PROGRESS", "CLOSED"];

const enquirySources = [
  { value: "PUBLIC_WEBSITE", label: "Website" },
  { value: "PUBLIC_QUOTE_REQUEST", label: "Quote requests" },
] as const;

const isStatusAllowedForModule = (module: Module, status: string) =>
  module === "bookings"
    ? bookingStatuses.includes(status as BookingStatus)
    : leadStatuses.includes(status as LeadStatus);

export function OperationsBoard({
  businessDate,
  onBusinessDateChange,
  board,
  cashierRows,
  isLoading,
}: {
  businessDate: string;
  onBusinessDateChange: (value: string) => void;
  board: OperationsBoardResponse | undefined;
  cashierRows: CashierSummaryResponse["rows"];
  isLoading: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("rently_admin_operations_collapsed");
      return saved ? JSON.parse(saved) === true : false;
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("rently_admin_operations_collapsed", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <section className="rounded-xl border border-slate-300 bg-white shadow-sm">
      <div className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${!isCollapsed ? "border-b border-slate-300" : ""}`}>
        <div className="flex items-start gap-3">
          <button
            onClick={toggleCollapsed}
            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            title={isCollapsed ? "Expand operations board" : "Collapse operations board"}
            aria-label={isCollapsed ? "Expand operations board" : "Collapse operations board"}
          >
            {isCollapsed ? (
              <FiChevronDown className="h-4 w-4" />
            ) : (
              <FiChevronUp className="h-4 w-4" />
            )}
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Front-desk operations
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {board
                ? `${board.propertyName} business day in ${board.timezone}`
                : "Loading property operations..."}
            </p>
          </div>
        </div>
        <label className="text-sm font-semibold text-slate-700">
          Business date
          <input
            type="date"
            value={businessDate}
            onChange={(event) => onBusinessDateChange(event.target.value)}
            className="mt-1 block h-10 rounded-md border border-slate-300 px-3 font-normal"
          />
        </label>
      </div>

      {!isCollapsed && (
        isLoading ? (
          <div className="p-5 text-sm text-slate-500">Loading operations...</div>
        ) : (
          <>
            {board && <OperationsSummaryCards summary={board.summary} />}

            <div className="grid gap-4 border-t border-slate-300 p-4 lg:grid-cols-2 bg-slate-50/50">
              <OperationsCashierPanel
                rows={cashierRows}
                timezone={board?.timezone}
              />

              <OperationsImmediateAttentionPanel board={board} />
            </div>
          </>
        )
      )}
    </section>
  );
}


export default function OperationsPage({ module }: Props) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    source: "",
  });
  const [actionError, setActionError] = useState("");

  const { properties, selectedPropertyId, setSelectedPropertyId, isLoading: isPropertyLoading } =
    useCurrentProperty();
  const activeFilters = useMemo(
    () => ({
      ...filters,
      status: isStatusAllowedForModule(module, filters.status)
        ? filters.status
        : "",
      source: module === "enquiries" ? filters.source : "",
    }),
    [filters, module],
  );

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    updateEnquiry,
    updateQuote,
    isMutating,
  } = useAdminOperations(module, selectedPropertyId, page, limit, activeFilters);
  const items = data?.items ?? [];
  const visiblePagination =
    data && data.pagination.total > limit ? data.pagination : null;

  const setFilterValue = (key: keyof typeof filters, value: string) => {
    setActionError("");
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const updateLeadStatus = async (
    type: "enquiry" | "quote",
    id: string,
    currentStatus: LeadStatus,
    nextStatus: LeadStatus,
  ) => {
    if (nextStatus === currentStatus) return;

    try {
      setActionError("");
      if (type === "enquiry") {
        await updateEnquiry({ enquiryId: id, status: nextStatus });
      } else {
        await updateQuote({ quoteId: id, status: nextStatus });
      }
    } catch (err) {
      setActionError(normalizeApiError(err).message);
    }
  };

  if (isPropertyLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="text-sm text-slate-500 animate-pulse">Loading properties...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OperationsFilters
        module={module}
        search={filters.search}
        status={activeFilters.status}
        source={activeFilters.source}
        statuses={module === "bookings" ? bookingStatuses : leadStatuses}
        enquirySources={enquirySources}
        selectedPropertyId={selectedPropertyId}
        selectedPropertyName={properties.find((property) => property.id === selectedPropertyId)?.name}
        onSearchChange={(value) => setFilterValue("search", value)}
        onStatusChange={(value) => setFilterValue("status", value)}
        onSourceChange={(value) => setFilterValue("source", value)}
        onPropertyChange={(value) => {
          setActionError("");
          setSelectedPropertyId(value);
          setPage(1);
        }}
      />

      {!selectedPropertyId ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div className="rounded-full bg-slate-50 p-4">
            <FiHome className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">No Property Selected</h3>
          <p className="mt-1 max-w-50 text-sm text-slate-500">
            No accessible properties found for this account.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {(actionError || isError) && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
              {actionError ||
                normalizeApiError(error).message ||
                "Could not load records."}
            </div>
          )}
          <div className="overflow-x-auto">
            <OperationsRecordsTable
              module={module}
              items={items}
              page={page}
              limit={limit}
              isPending={isPending}
              isFetching={isFetching}
              isError={isError}
              isMutating={isMutating}
              onLeadStatusChange={(type, id, currentStatus, nextStatus) => {
                void updateLeadStatus(type, id, currentStatus, nextStatus);
              }}
            />
          </div>
          {visiblePagination && (
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left Side: Page Size Selector */}
              <div className="flex flex-wrap items-center gap-2.5 text-sm text-slate-600">
                <span>Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50/50 cursor-pointer transition-all"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>entries</span>
                <span className="text-xs text-slate-400 font-medium sm:ml-2">
                  (Showing {Math.min((page - 1) * limit + 1, visiblePagination.total)} to {Math.min(page * limit, visiblePagination.total)} of {visiblePagination.total})
                </span>
              </div>

              {/* Right Side: Pagination navigation */}
              {visiblePagination.totalPages > 1 && (
                <div className="shrink-0">
                  <Pagination
                    page={page}
                    totalPages={visiblePagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
