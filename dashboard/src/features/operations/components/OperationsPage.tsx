import { useMemo, useState } from "react";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useAdminOperations } from "../hooks/useAdminOperations";
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import type {
  AdminBooking,
  AdminEnquiry,
  AdminQuote,
  BookingStatus,
  CashierSummaryResponse,
  LeadStatus,
  OperationsBoardResponse,
} from "../types";
import StatusBadge from "@/components/common/StatusBadge";
import Pagination from "@/components/common/Pagination";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { normalizeApiError } from "@/utils/errors";
import {
  OPERATION_PALETTE,
  getBookingStatusTone,
} from "../operationPalette";
import {
  FiChevronDown,
  FiChevronUp,
  FiLogIn,
  FiLogOut,
  FiClock,
  FiAlertTriangle,
  FiDollarSign,
  FiRefreshCw,
  FiTool,
  FiCheck,
} from "react-icons/fi";

const {
  FiClipboard,
  FiFilter,
  FiHome,
  FiMail,
  FiPlus,
  FiSearch,
} = ICON_REGISTRY;

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

const formatEnquirySource = (source: string | null) =>
  enquirySources.find((item) => item.value === source)?.label ??
  source ??
  "Website";



const isStatusAllowedForModule = (module: Module, status: string) =>
  module === "bookings"
    ? bookingStatuses.includes(status as BookingStatus)
    : leadStatuses.includes(status as LeadStatus);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatTransactionTime = (value: string, timeZone?: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(new Date(value));

const getBookingAssignedSummary = (booking: AdminBooking) => {
  if (booking.items.length === 0) {
    return booking.targetLabel;
  }

  return booking.items.map((item) => item.targetLabel).join(" + ");
};

const getBookingRefundIndicator = (booking: AdminBooking) => {
  if (booking.refundRequest?.status === "REQUESTED") {
    return "Refund requested";
  }

  if (booking.refundRequest?.status === "IN_REVIEW") {
    return "Refund in review";
  }

  if (booking.refundRequest?.status === "REJECTED") {
    return "Refund rejected";
  }

  if (
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    Number(booking.paidAmount) > 0 &&
    Number(booking.refundableAmount) <= 0
  ) {
    return "Refunded";
  }

  if (
    (booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
    Number(booking.refundableAmount) > 0
  ) {
    return "Refund pending";
  }

  return null;
};

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
  const [expandedEmployeeKey, setExpandedEmployeeKey] = useState<string | null>(null);
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

  const totals = useMemo(() => {
    let expectedCash = 0;
    let refunds = 0;
    let netCollected = 0;
    const byMethod: Record<string, number> = {};

    cashierRows.forEach((row) => {
      expectedCash += row.expectedCash;
      refunds += row.refunds;
      netCollected += row.netCollected;
      Object.entries(row.byMethod).forEach(([method, amount]) => {
        byMethod[method] = (byMethod[method] || 0) + (amount as number);
      });
    });

    return { expectedCash, refunds, netCollected, byMethod };
  }, [cashierRows]);

  const summaryItems = board
    ? [
        {
          label: "Arrivals",
          value: board.summary.arrivals,
          icon: <FiLogIn className={`h-3.5 w-3.5 ${OPERATION_PALETTE.arrivals.icon}`} />,
          tone: OPERATION_PALETTE.arrivals,
          description: "Expected check-ins today",
        },
        {
          label: "Departures",
          value: board.summary.departures,
          icon: <FiLogOut className={`h-3.5 w-3.5 ${OPERATION_PALETTE.departures.icon}`} />,
          tone: OPERATION_PALETTE.departures,
          description: "Expected check-outs today",
        },
        {
          label: "In house",
          value: board.summary.inHouse,
          icon: <FiHome className={`h-3.5 w-3.5 ${OPERATION_PALETTE.inHouse.icon}`} />,
          tone: OPERATION_PALETTE.inHouse,
          description: "Guests currently staying",
        },
        {
          label: "Late arrivals",
          value: board.summary.lateArrivals,
          icon: <FiClock className={`h-3.5 w-3.5 ${OPERATION_PALETTE.late.icon}`} />,
          tone: OPERATION_PALETTE.late,
          description: "Missed scheduled check-in",
        },
        {
          label: "Unassigned",
          value: board.summary.unassignedArrivals,
          icon: <FiAlertTriangle className={`h-3.5 w-3.5 ${OPERATION_PALETTE.unassigned.icon}`} />,
          tone: OPERATION_PALETTE.unassigned,
          description: "Needs room assignment",
        },
        {
          label: "Balance due",
          value: board.summary.balanceDue,
          icon: <FiDollarSign className={`h-3.5 w-3.5 ${OPERATION_PALETTE.balance.icon}`} />,
          tone: OPERATION_PALETTE.balance,
          description: "Bookings with outstanding dues",
        },
        {
          label: "Housekeeping",
          value: board.summary.housekeeping,
          icon: <FiClipboard className={`h-3.5 w-3.5 ${OPERATION_PALETTE.housekeeping.icon}`} />,
          tone: OPERATION_PALETTE.housekeeping,
          description: "Dirty or cleaning rooms",
        },
        {
          label: "Refund attention",
          value: board.summary.refundAttention,
          icon: <FiRefreshCw className={`h-3.5 w-3.5 ${OPERATION_PALETTE.refunds.icon}`} />,
          tone: OPERATION_PALETTE.refunds,
          description: "Active refund requests",
        },
        {
          label: "Maintenance",
          value: board.summary.maintenanceConflicts,
          icon: <FiTool className={`h-3.5 w-3.5 ${OPERATION_PALETTE.maintenance.icon}`} />,
          tone: OPERATION_PALETTE.maintenance,
          description: "Maintenance conflicts",
        },
      ]
    : [];

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
            <div className="grid gap-2.5 p-4 sm:grid-cols-3 xl:grid-cols-5">
              {summaryItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${item.tone.card}`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="space-y-0.5">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${item.tone.label}`}>
                        {item.label}
                      </span>
                      <div className={`text-2xl font-black leading-none ${item.tone.value}`}>
                        {item.value}
                      </div>
                    </div>
                    <div className={`rounded-md border p-1.5 shrink-0 ${item.tone.iconBox}`}>
                      {item.icon}
                    </div>
                  </div>
                  <p className={`mt-1.5 text-[9px] font-medium leading-tight ${item.tone.muted}`}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 border-t border-slate-300 p-4 lg:grid-cols-2 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Cashier by employee
                </h3>
                <div className="mt-4 space-y-3">
                  {cashierRows.length > 0 ? (
                    <>
                      {/* Grand Total Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border-l-4 border-l-indigo-600 border border-slate-300 bg-indigo-50/15 p-2.5 gap-3 transition-all duration-200">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-indigo-600 text-white font-extrabold text-sm border border-indigo-700/50">
                            Σ
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                              <span className="font-bold text-xs text-indigo-950">
                                Grand Total
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1">
                                Expected Cash: <strong className="text-slate-700 font-semibold">{formatMoney(totals.expectedCash)}</strong>
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="flex items-center gap-1">
                                Refunds: <strong className="text-rose-600 font-semibold">{formatMoney(totals.refunds)}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-indigo-200/50 pt-2 sm:pt-0 sm:pl-3 gap-1">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500/80">Net Collected</div>
                            <div className={`text-lg font-black tracking-tight ${totals.netCollected >= 0 ? "text-emerald-600" : "text-rose-600"} leading-none`}>
                              {formatMoney(totals.netCollected)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Employee Breakdown List */}
                      <div className="space-y-3 pt-1.5 border-t border-dashed border-slate-200">
                        {cashierRows.map((row) => {
                          const empKey = row.receivedByUserId ?? "SYSTEM";
                          const isExpanded = expandedEmployeeKey === empKey;
                          return (
                            <div
                              key={empKey}
                              className="flex flex-col rounded-lg border border-slate-300 bg-white hover:border-slate-400 transition-all duration-200"
                            >
                                {/* Header (Clickable to Expand) */}
                                <div
                                  className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-3 cursor-pointer select-none"
                                  onClick={() => setExpandedEmployeeKey(isExpanded ? null : empKey)}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-300/50">
                                      {row.receivedByName.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                                        <span className="font-bold text-xs text-slate-900">
                                          {row.receivedByName}
                                        </span>
                                        {Object.entries(row.byMethod).map(([method, amount]) => (
                                          <span
                                            key={method}
                                            className="inline-flex items-center rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider"
                                          >
                                            {formatEnumLabel(method)}: {formatMoney(amount)}
                                          </span>
                                        ))}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                                        <span className="flex items-center gap-1">
                                          Expected Cash: <strong className="text-slate-700 font-semibold">{formatMoney(row.expectedCash)}</strong>
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="flex items-center gap-1">
                                          Refunds: <strong className="text-rose-600 font-semibold">{formatMoney(row.refunds)}</strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 gap-1">
                                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net Collected</div>
                                      <div className={`text-lg font-black tracking-tight ${row.netCollected >= 0 ? "text-emerald-600" : "text-rose-600"} leading-none`}>
                                        {formatMoney(row.netCollected)}
                                      </div>
                                    </div>
                                    <div className="text-slate-450 shrink-0">
                                      {isExpanded ? (
                                        <FiChevronUp className="h-4 w-4" />
                                      ) : (
                                        <FiChevronDown className="h-4 w-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Expandable Detail Section */}
                                {isExpanded && (
                                  <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-b-lg">
                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 mb-2">
                                      Payment History ({row.history?.length ?? 0})
                                    </h4>
                                    {row.history && row.history.length > 0 ? (
                                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto overscroll-contain pr-2">
                                        {row.history.map((tx) => (
                                          <div
                                            key={tx.id}
                                            className="flex items-center justify-between rounded bg-white border border-slate-200 p-2 text-xs gap-3 shadow-2xs"
                                          >
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span
                                                className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                                                  tx.type === "PAYMENT"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                                    : "bg-rose-50 text-rose-700 border-rose-200/60"
                                                }`}
                                              >
                                                {tx.type}
                                              </span>
                                              <a
                                                href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(tx.bookingId))}
                                                className="font-bold font-mono text-indigo-600 hover:text-indigo-855 hover:underline shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                {tx.bookingRef}
                                              </a>
                                              <span className="text-slate-300 shrink-0">|</span>
                                              <span className="text-slate-700 truncate font-semibold">
                                                {tx.guestName}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                              <span className="text-[9px] font-semibold text-slate-400">
                                                {formatTransactionTime(tx.time, board?.timezone)}
                                              </span>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                {formatEnumLabel(tx.method)}
                                              </span>
                                              <span
                                                className={`font-extrabold ${
                                                  tx.type === "PAYMENT" ? "text-slate-900" : "text-rose-600"
                                                }`}
                                              >
                                                {tx.type === "PAYMENT" ? "" : "-"}{formatMoney(tx.amount)}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-500 font-medium py-1">
                                        No payments or refunds recorded.
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                      No successful payments for this business date.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                  Immediate attention
                </h3>
                <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {board &&
                  board.lateArrivals.length +
                    board.unassignedArrivals.length +
                    board.maintenanceConflicts.length >
                    0 ? (
                    <>
                      {board.lateArrivals.map((booking) => (
                        <a
                          key={`late-${booking.id}`}
                          href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                          className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/15 hover:bg-amber-50/40 px-3.5 py-2.5 text-amber-900 transition-all duration-200 hover:shadow-xs hover:-translate-x-0.5"
                        >
                          <FiClock className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs tracking-tight text-amber-950">Late Arrival Alert</div>
                            <div className="text-[10px] text-amber-800 mt-1 font-semibold">
                              Ref: <span className="font-mono text-amber-950 bg-amber-100/60 px-1 py-0.5 rounded border border-amber-200/50">{booking.bookingRef}</span> • {booking.guestName}
                            </div>
                          </div>
                        </a>
                      ))}
                      {board.unassignedArrivals.map((booking) => (
                        <a
                          key={`unassigned-${booking.id}`}
                          href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                          className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/15 hover:bg-rose-50/40 px-3.5 py-2.5 text-rose-900 transition-all duration-200 hover:shadow-xs hover:-translate-x-0.5"
                        >
                          <FiAlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs tracking-tight text-rose-950">Room Assignment Required</div>
                            <div className="text-[10px] text-rose-800 mt-1 font-semibold">
                              Ref: <span className="font-mono text-rose-950 bg-rose-100/60 px-1 py-0.5 rounded border border-rose-200/50">{booking.bookingRef}</span> • {booking.guestName || "Guest"}
                            </div>
                          </div>
                        </a>
                      ))}
                      {board.maintenanceConflicts.map((conflict) => (
                        <div
                          key={`${conflict.maintenanceId}-${conflict.booking.id}`}
                          className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-red-650 border-red-200 bg-red-50/15 px-3.5 py-2.5 text-red-900 shadow-2xs"
                        >
                          <FiTool className="h-4.5 w-4.5 text-red-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-extrabold text-xs tracking-tight text-red-950">{formatEnumLabel(conflict.priority)} Maintenance Conflict</div>
                            <div className="text-[10px] text-red-800 mt-1 font-semibold">
                              Room block affects booking Ref: <span className="font-mono text-red-950 bg-red-100/60 px-1 py-0.5 rounded border border-red-200/50">{conflict.booking.bookingRef}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="flex items-center rounded-lg border-l-4 border-l-emerald-600 border border-slate-300 bg-emerald-50/15 p-2.5 gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-emerald-600 text-white font-extrabold text-sm border border-emerald-700/50">
                        <FiCheck className="h-4 w-4" />
                      </div>
                      <div className="font-bold text-xs text-emerald-950 leading-tight">
                        No urgent operational exceptions.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )
      )}
    </section>
  );
}

function GuestAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-sky-100 text-sky-700",
  ];

  const colorIndex = name.length % colors.length;
  const colorClass = colors[colorIndex];

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {initials}
    </div>
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
  const statuses = module === "bookings" ? bookingStatuses : leadStatuses;
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
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center">
        <div className="relative flex-1 lg:max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) =>
              setFilterValue("search", event.target.value)
            }
            placeholder={`Search ${module}...`}
            className="h-10 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-50/50"
          />
        </div>

        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:items-center">
          <div className="relative">
            <FiHome className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedPropertyId}
              onChange={(event) => {
                setActionError("");
                setSelectedPropertyId(event.target.value || null);
                setPage(1);
              }}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-72"
            >
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={activeFilters.status}
              onChange={(event) =>
                setFilterValue("status", event.target.value)
              }
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {formatEnumLabel(status)}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {module === "enquiries" && (
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={activeFilters.source}
                onChange={(event) =>
                  setFilterValue("source", event.target.value)
                }
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-sm transition-colors focus:border-indigo-500 focus:outline-none lg:w-40"
              >
                <option value="">All sources</option>
                {enquirySources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>

        {module === "bookings" && (
          <div className="flex items-center gap-3 lg:ml-auto">
            <div className="h-6 w-px bg-slate-200 hidden lg:block mr-1" />
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
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 z-10 bg-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-700 backdrop-blur-sm border-b border-slate-300">
                {module === "bookings" ? (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 w-16 text-center">#SN</th>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Assigned Room/Unit</th>
                    <th className="whitespace-nowrap px-6 py-4">Dates</th>
                    <th className="whitespace-nowrap px-6 py-4 text-right">Financials</th>
                    <th className="whitespace-nowrap px-6 py-4 text-center">Status</th>
                    <th className="whitespace-nowrap px-6 py-4 text-right">Details</th>
                  </tr>
                ) : module === "enquiries" ? (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 w-16 text-center">#SN</th>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Message</th>
                    <th className="whitespace-nowrap px-6 py-4">Source</th>
                    <th className="whitespace-nowrap px-6 py-4">Created</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 w-16 text-center">#SN</th>
                    <th className="whitespace-nowrap px-6 py-4">Guest</th>
                    <th className="whitespace-nowrap px-6 py-4">Product</th>
                    <th className="whitespace-nowrap px-6 py-4">Dates</th>
                    <th className="whitespace-nowrap px-6 py-4">Notes</th>
                    <th className="whitespace-nowrap px-6 py-4">Status</th>
                  </tr>
                )}
              </thead>
            <tbody className={`divide-y divide-slate-200 ${isFetching ? "opacity-70" : ""}`}>
              {isPending && items.length === 0 ? (
                <EmptyRow
                  message="Loading records..."
                  colSpan={module === "bookings" ? 7 : 6}
                />
              ) : isError ? (
                <EmptyRow
                  message="Could not load records."
                  colSpan={module === "bookings" ? 7 : 6}
                />
              ) : items.length === 0 ? (
                <EmptyRow
                  message="No records found."
                  colSpan={module === "bookings" ? 7 : 6}
                />
              ) : module === "bookings" ? (
                (items as AdminBooking[]).map((booking, index) => {
                  const bookingTone = getBookingStatusTone(booking.status);

                  return (
                  <tr
                    key={booking.id}
                    className={`transition-all duration-150 ${bookingTone.rowHover}`}
                  >
                    <td className={`border-l-4 px-6 py-4 text-center text-sm font-semibold text-slate-500 whitespace-nowrap ${bookingTone.tableAccent}`}>
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={booking.guestName} />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-bold text-slate-900 text-sm">
                              {booking.guestName}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1 min-w-0">
                              <FiMail className="shrink-0 text-slate-400" />
                              <span className="truncate" title={booking.guestEmail}>{booking.guestEmail}</span>
                            </span>
                          </div>
                          <div className="pt-0.5 text-[11px] font-semibold text-slate-500">
                            <span>{booking.guestCount} {booking.guestCount === 1 ? "guest" : "guests"}</span>
                            <span className="mx-1.5 text-slate-300">/</span>
                            <span className="font-mono text-slate-600">{booking.bookingRef}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {getBookingAssignedSummary(booking)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col text-sm text-slate-600">
                        <span>{formatDate(booking.checkIn)}</span>
                        <span>{formatDate(booking.checkOut)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-base font-black text-indigo-700 leading-tight">
                          {formatMoney(booking.totalAmount)}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[9px] font-extrabold uppercase tracking-wider">
                          {Number(booking.upfrontAmount) > 0 ? (
                            <span className="text-emerald-600 bg-emerald-50/60 border border-emerald-200 px-1.5 py-0.5 rounded">Token: {formatMoney(booking.upfrontAmount)}</span>
                          ) : (
                            <span className="text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">No upfront</span>
                          )}
                        </div>
                        {getBookingRefundIndicator(booking) && (
                          <div className="text-[9px] font-extrabold uppercase tracking-wider text-amber-650 bg-amber-50/60 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                            {getBookingRefundIndicator(booking)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        <StatusBadge status={booking.status} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        to={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                        className="whitespace-nowrap"
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                  );
                })
              ) : module === "enquiries" ? (
                (items as AdminEnquiry[]).map((enquiry, index) => (
                  <tr key={enquiry.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500 whitespace-nowrap">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={enquiry.name} />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {enquiry.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {enquiry.email} / {enquiry.contactNumber}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-sm px-6 py-4">
                      <div className="line-clamp-2 text-sm text-slate-600 italic">
                        "{enquiry.message}"
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        {formatEnquirySource(enquiry.source)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(enquiry.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusSelect
                        value={enquiry.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateLeadStatus(
                            "enquiry",
                            enquiry.id,
                            enquiry.status,
                            status as LeadStatus,
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                (items as AdminQuote[]).map((quote, index) => (
                  <tr key={quote.id} className="transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4 text-center text-sm font-semibold text-slate-500 whitespace-nowrap">
                      {(page - 1) * limit + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <GuestAvatar name={quote.guestName ?? "Guest"} />
                        <div>
                          <div className="font-semibold text-slate-900">
                            {quote.guestName ?? "Guest"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {quote.guestEmail ?? "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {quote.productName ?? quote.targetType}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(quote.checkIn)} - {formatDate(quote.checkOut)}
                    </td>
                    <td className="max-w-sm px-6 py-4">
                      <div className="line-clamp-1 text-sm text-slate-500">
                        {quote.notes ?? "No notes"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusSelect
                        value={quote.status}
                        statuses={leadStatuses}
                        disabled={isMutating}
                        onChange={(status) => {
                          void updateLeadStatus(
                            "quote",
                            quote.id,
                            quote.status,
                            status as LeadStatus,
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
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

function EmptyRow({ message, colSpan = 5 }: { message: string; colSpan?: number }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-8 text-center text-sm text-slate-500"
      >
        {message}
      </td>
    </tr>
  );
}

function StatusSelect({
  value,
  statuses,
  disabled,
  onChange,
}: {
  value: string;
  statuses: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="group relative flex items-center gap-2">
      <StatusBadge status={value} className="scale-95 group-hover:scale-100 transition-transform origin-left" />
      <div className="relative">
        <select
          value={value}
          disabled={disabled || statuses.length <= 1}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-full appearance-none rounded border border-slate-200 bg-slate-50/50 pl-2 pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-none transition-all hover:bg-white focus:border-indigo-500 focus:bg-white disabled:opacity-50"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatEnumLabel(status)}
            </option>
          ))}
        </select>
        <FiFilter className="pointer-events-none absolute right-1.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}
