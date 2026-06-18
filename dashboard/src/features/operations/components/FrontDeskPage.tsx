import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Button from "@/components/ui/Button";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { ADMIN_KEYS } from "@/features/config/adminKeys";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { normalizeApiError } from "@/utils/errors";
import {
  FiChevronDown,
  FiChevronUp,
  FiCreditCard,
  FiRefreshCw,
} from "react-icons/fi";
import {
  getCashierSummaryApi,
  getOperationsBoardApi,
} from "../api";
import type {
  AdminBooking,
  CashierSummaryResponse,
  OperationsBoardResponse,
} from "../types";
import {
  OPERATION_PALETTE,
  type OperationToneKey,
} from "../operationPalette";

const {
  FiAlertTriangle,
  FiCheck,
  FiClipboard,
  FiCoffee,
  FiDollarSign,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiTool,
} = ICON_REGISTRY;

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

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

const getRefundLabel = (booking: AdminBooking) => {
  if (booking.refundRequest?.status === "REQUESTED") return "Refund requested";
  if (booking.refundRequest?.status === "IN_REVIEW") return "Refund in review";
  if (booking.refundRequest?.status === "REJECTED") return "Refund rejected";
  if (Number(booking.refundableAmount) > 0) return "Refund pending";
  return "Refund attention";
};

const emptyCashierRows: CashierSummaryResponse["rows"] = [];

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function KpiCard({
  label,
  value,
  description,
  icon,
  className,
  tone,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: ReactNode;
  className: string;
  tone: (typeof OPERATION_PALETTE)[OperationToneKey];
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${tone.label}`}>
            {label}
          </p>
          <p className={`mt-1 text-2xl font-black leading-none ${tone.value}`}>
            {value}
          </p>
        </div>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${tone.iconBox}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-2 text-[11px] font-semibold leading-tight ${tone.muted}`}>
        {description}
      </p>
    </div>
  );
}

function BookingMiniCard({
  booking,
  tone = "neutral",
  meta,
}: {
  booking: AdminBooking;
  tone?: OperationToneKey;
  meta?: string;
}) {
  const toneStyle = OPERATION_PALETTE[tone];

  return (
    <a
      href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
      className={`block rounded-lg border border-l-4 px-3 py-2.5 text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneStyle.miniCard}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`font-mono text-[11px] font-extrabold ${toneStyle.label}`}>
              {booking.bookingRef}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
              {formatEnumLabel(booking.status)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs font-bold text-slate-950">
            {booking.guestName || "Guest"}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
            {getBookingAssignedSummary(booking)}
          </p>
        </div>
        <div className="shrink-0 text-right text-[11px] font-semibold text-slate-500">
          <div>{formatDate(booking.checkIn)}</div>
          <div>{formatDate(booking.checkOut)}</div>
        </div>
      </div>
      {meta && (
        <p className={`mt-2 border-t border-white/70 pt-2 text-[11px] font-semibold ${toneStyle.muted}`}>
          {meta}
        </p>
      )}
    </a>
  );
}

function CashierPanel({
  rows,
  timeZone,
}: {
  rows: CashierSummaryResponse["rows"];
  timeZone?: string;
}) {
  const [expandedEmployeeKey, setExpandedEmployeeKey] = useState<string | null>(
    null,
  );

  const totals = useMemo(() => {
    let expectedCash = 0;
    let refunds = 0;
    let netCollected = 0;
    const byMethod: Record<string, number> = {};

    rows.forEach((row) => {
      expectedCash += row.expectedCash;
      refunds += row.refunds;
      netCollected += row.netCollected;
      Object.entries(row.byMethod).forEach(([method, amount]) => {
        byMethod[method] = (byMethod[method] || 0) + (amount as number);
      });
    });

    return { expectedCash, refunds, netCollected, byMethod };
  }, [rows]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
              Cashier By Employee
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Payments, refunds, expected cash, and employee-level history.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-right text-xs sm:min-w-96">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <div className="font-bold uppercase tracking-wider text-slate-400">
                Expected
              </div>
              <div className="font-black text-slate-900">
                {formatMoney(totals.expectedCash)}
              </div>
            </div>
            <div className="rounded-lg bg-rose-50 px-2 py-1.5">
              <div className="font-bold uppercase tracking-wider text-rose-400">
                Refunds
              </div>
              <div className="font-black text-rose-700">
                {formatMoney(totals.refunds)}
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
              <div className="font-bold uppercase tracking-wider text-emerald-500">
                Net
              </div>
              <div className="font-black text-emerald-700">
                {formatMoney(totals.netCollected)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {rows.length === 0 ? (
          <EmptyState message="No successful payments for this business date." />
        ) : (
          rows.map((row) => {
            const empKey = row.receivedByUserId ?? "SYSTEM";
            const isExpanded = expandedEmployeeKey === empKey;

            return (
              <div
                key={empKey}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedEmployeeKey(isExpanded ? null : empKey)}
                  className="flex w-full flex-col gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-indigo-50 text-xs font-extrabold text-indigo-700">
                      {row.receivedByName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-950">
                          {row.receivedByName}
                        </span>
                        {Object.entries(row.byMethod).map(([method, amount]) => (
                          <span
                            key={method}
                            className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500"
                          >
                            {formatEnumLabel(method)}: {formatMoney(amount)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-slate-500">
                        <span>Expected Cash: {formatMoney(row.expectedCash)}</span>
                        <span>Refunds: {formatMoney(row.refunds)}</span>
                        <span>History: {row.history.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                    <div className="text-right">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Net Collected
                      </div>
                      <div
                        className={`text-lg font-black ${
                          row.netCollected >= 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                        }`}
                      >
                        {formatMoney(row.netCollected)}
                      </div>
                    </div>
                    {isExpanded ? (
                      <FiChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <FiChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-3">
                    <h3 className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Payment History ({row.history.length})
                    </h3>
                    {row.history.length > 0 ? (
                      <div className="max-h-[220px] space-y-1.5 overflow-y-auto overscroll-contain pr-2">
                        {row.history.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2 text-xs shadow-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={`rounded-sm border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                                  tx.type === "PAYMENT"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                              >
                                {tx.type}
                              </span>
                              <a
                                href={adminPath(
                                  ADMIN_ROUTES.BOOKING_DETAIL(tx.bookingId),
                                )}
                                className="shrink-0 font-mono font-bold text-indigo-600 hover:underline"
                                onClick={(event) => event.stopPropagation()}
                              >
                                {tx.bookingRef}
                              </a>
                              <span className="text-slate-300">|</span>
                              <span className="truncate font-semibold text-slate-700">
                                {tx.guestName}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-3 text-right">
                              <span className="text-[9px] font-semibold text-slate-400">
                                {formatTransactionTime(tx.time, timeZone)}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                {formatEnumLabel(tx.method)}
                              </span>
                              <span
                                className={`font-extrabold ${
                                  tx.type === "PAYMENT"
                                    ? "text-slate-900"
                                    : "text-rose-600"
                                }`}
                              >
                                {tx.type === "PAYMENT" ? "" : "-"}
                                {formatMoney(tx.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-slate-500">
                        No payments or refunds recorded.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function AttentionPanel({ board }: { board: OperationsBoardResponse }) {
  const totalAttention =
    board.lateArrivals.length +
    board.unassignedArrivals.length +
    board.maintenanceConflicts.length +
    board.balanceDue.length +
    board.refundAttention.length +
    board.housekeeping.length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
          Immediate Attention
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Exceptions and operational queues that need staff action.
        </p>
      </div>

      <div className="max-h-[520px] space-y-3 overflow-y-auto overscroll-contain p-4 pr-3">
        {totalAttention === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-emerald-600 text-white">
              <FiCheck className="h-4 w-4" />
            </div>
            <div className="text-sm font-bold">No urgent operational exceptions.</div>
          </div>
        ) : (
          <>
            {board.lateArrivals.map((booking) => (
              <BookingMiniCard
                key={`late-${booking.id}`}
                booking={booking}
                tone="late"
                meta="Late arrival alert"
              />
            ))}
            {board.unassignedArrivals.map((booking) => (
              <BookingMiniCard
                key={`unassigned-${booking.id}`}
                booking={booking}
                tone="unassigned"
                meta="Room or unit assignment required"
              />
            ))}
            {board.balanceDue.map((booking) => (
              <BookingMiniCard
                key={`balance-${booking.id}`}
                booking={booking}
                tone="balance"
                meta={`Balance due: ${formatMoney(booking.balanceAmount)}`}
              />
            ))}
            {board.refundAttention.map((booking) => (
              <BookingMiniCard
                key={`refund-${booking.id}`}
                booking={booking}
                tone="refunds"
                meta={getRefundLabel(booking)}
              />
            ))}
            {board.maintenanceConflicts.map((conflict) => (
              <BookingMiniCard
                key={`${conflict.maintenanceId}-${conflict.booking.id}`}
                booking={conflict.booking}
                tone="maintenance"
                meta={`${formatEnumLabel(conflict.priority)} maintenance conflict`}
              />
            ))}
            {board.housekeeping.map((room) => (
              <a
                key={room.roomId}
                href={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
                className={`block rounded-lg border border-l-4 px-3 py-2.5 text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${OPERATION_PALETTE.housekeeping.miniCard}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-bold ${OPERATION_PALETTE.housekeeping.value}`}>
                      Room {room.roomNumber} - {room.roomName}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      Unit {room.unitNumber}, Floor {room.floor}
                    </p>
                  </div>
                  <span className={`rounded border px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider ${OPERATION_PALETTE.housekeeping.pill}`}>
                    {formatEnumLabel(room.status)}
                  </span>
                </div>
              </a>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function WorkflowPanel({
  title,
  description,
  bookings,
  tone,
}: {
  title: string;
  description: string;
  bookings: AdminBooking[];
  tone: OperationToneKey;
}) {
  const toneStyle = OPERATION_PALETTE[tone];

  return (
    <section className={`rounded-xl border bg-white shadow-sm ${toneStyle.card}`}>
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className={`text-sm font-extrabold uppercase tracking-wider ${toneStyle.label}`}>
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          </div>
          <span className={`rounded-lg border px-2.5 py-1 text-xs font-black ${toneStyle.pill}`}>
            {bookings.length}
          </span>
        </div>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto overscroll-contain p-4 pr-3">
        {bookings.length === 0 ? (
          <EmptyState message={`No ${title.toLowerCase()} for this business date.`} />
        ) : (
          bookings.map((booking) => (
            <BookingMiniCard key={booking.id} booking={booking} tone={tone} />
          ))
        )}
      </div>
    </section>
  );
}

export default function FrontDeskPage() {
  const [businessDate, setBusinessDate] = useState(() =>
    toDateInput(new Date()),
  );
  const {
    selectedPropertyId,
    isLoading: isPropertyLoading,
  } = useCurrentProperty();

  const operationsBoardQuery = useQuery({
    queryKey: selectedPropertyId
      ? ADMIN_KEYS.operations.operationsBoard(selectedPropertyId, businessDate)
      : ADMIN_KEYS.operations.all(),
    queryFn: () => {
      if (!selectedPropertyId) throw new Error("PropertyId required");
      return getOperationsBoardApi(selectedPropertyId, businessDate);
    },
    enabled: Boolean(selectedPropertyId),
  });

  const cashierSummaryQuery = useQuery({
    queryKey: selectedPropertyId
      ? ADMIN_KEYS.operations.cashierSummary(
          selectedPropertyId,
          businessDate,
          addDays(businessDate, 1),
        )
      : ADMIN_KEYS.operations.all(),
    queryFn: () => {
      if (!selectedPropertyId) throw new Error("PropertyId required");
      return getCashierSummaryApi(selectedPropertyId, {
        from: businessDate,
        to: addDays(businessDate, 1),
      });
    },
    enabled: Boolean(selectedPropertyId),
  });

  const board = operationsBoardQuery.data;
  const cashierRows = cashierSummaryQuery.data?.rows ?? emptyCashierRows;
  const cashierTotals = useMemo(
    () =>
      cashierRows.reduce(
        (totals, row) => ({
          netCollected: totals.netCollected + row.netCollected,
        }),
        { netCollected: 0 },
      ),
    [cashierRows],
  );
  const isLoading =
    isPropertyLoading ||
    operationsBoardQuery.isPending ||
    cashierSummaryQuery.isPending;
  const errorMessage =
    operationsBoardQuery.isError || cashierSummaryQuery.isError
      ? normalizeApiError(
          operationsBoardQuery.error ?? cashierSummaryQuery.error,
        ).message || "Could not load front-desk operations."
      : "";

  const summaryItems = board
    ? [
        {
          label: "Arrivals",
          value: board.summary.arrivals,
          description: "Expected check-ins today",
          icon: <FiLogIn className={`h-4 w-4 ${OPERATION_PALETTE.arrivals.icon}`} />,
          className: OPERATION_PALETTE.arrivals.card,
          tone: OPERATION_PALETTE.arrivals,
        },
        {
          label: "Departures",
          value: board.summary.departures,
          description: "Expected check-outs today",
          icon: <FiLogOut className={`h-4 w-4 ${OPERATION_PALETTE.departures.icon}`} />,
          className: OPERATION_PALETTE.departures.card,
          tone: OPERATION_PALETTE.departures,
        },
        {
          label: "In House",
          value: board.summary.inHouse,
          description: "Guests currently staying",
          icon: <FiHome className={`h-4 w-4 ${OPERATION_PALETTE.inHouse.icon}`} />,
          className: OPERATION_PALETTE.inHouse.card,
          tone: OPERATION_PALETTE.inHouse,
        },
        {
          label: "Late",
          value: board.summary.lateArrivals,
          description: "Missed scheduled check-in",
          icon: <FiAlertTriangle className={`h-4 w-4 ${OPERATION_PALETTE.late.icon}`} />,
          className: OPERATION_PALETTE.late.card,
          tone: OPERATION_PALETTE.late,
        },
        {
          label: "Unassigned",
          value: board.summary.unassignedArrivals,
          description: "Needs room or unit assignment",
          icon: <FiClipboard className={`h-4 w-4 ${OPERATION_PALETTE.unassigned.icon}`} />,
          className: OPERATION_PALETTE.unassigned.card,
          tone: OPERATION_PALETTE.unassigned,
        },
        {
          label: "Balance Due",
          value: board.summary.balanceDue,
          description: "Bookings with outstanding dues",
          icon: <FiDollarSign className={`h-4 w-4 ${OPERATION_PALETTE.balance.icon}`} />,
          className: OPERATION_PALETTE.balance.card,
          tone: OPERATION_PALETTE.balance,
        },
        {
          label: "Net Collected",
          value: formatMoney(cashierTotals.netCollected),
          description: "Payments minus refunds today",
          icon: <FiCreditCard className={`h-4 w-4 ${OPERATION_PALETTE.cashier.icon}`} />,
          className: OPERATION_PALETTE.cashier.card,
          tone: OPERATION_PALETTE.cashier,
        },
        {
          label: "Housekeeping",
          value: board.summary.housekeeping,
          description: "Dirty or cleaning rooms",
          icon: <FiCoffee className={`h-4 w-4 ${OPERATION_PALETTE.housekeeping.icon}`} />,
          className: OPERATION_PALETTE.housekeeping.card,
          tone: OPERATION_PALETTE.housekeeping,
        },
        {
          label: "Refunds",
          value: board.summary.refundAttention,
          description: "Active refund requests",
          icon: <FiRefreshCw className={`h-4 w-4 ${OPERATION_PALETTE.refunds.icon}`} />,
          className: OPERATION_PALETTE.refunds.card,
          tone: OPERATION_PALETTE.refunds,
        },
        {
          label: "Maintenance",
          value: board.summary.maintenanceConflicts,
          description: "Maintenance conflicts",
          icon: <FiTool className={`h-4 w-4 ${OPERATION_PALETTE.maintenance.icon}`} />,
          className: OPERATION_PALETTE.maintenance.card,
          tone: OPERATION_PALETTE.maintenance,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <FiCoffee className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-950">
                Front Desk
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {board
                  ? `${board.propertyName} business day in ${board.timezone}`
                  : "Daily arrivals, cashier, and operational attention queues"}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-end">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Business Date
              <input
                type="date"
                value={businessDate}
                onChange={(event) => setBusinessDate(event.target.value)}
                className="mt-1 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none xl:w-44"
              />
            </label>

            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <Button
                size="md"
                variant="secondary"
                icon={<FiClipboard />}
                to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
              >
                Room Board
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
          </div>
        </div>
      </section>

      {!selectedPropertyId ? (
        <EmptyState message="Select a property to load front-desk operations." />
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Loading front-desk operations...
        </div>
      ) : board ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {summaryItems.map((item) => (
              <KpiCard key={item.label} {...item} />
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
            <CashierPanel rows={cashierRows} timeZone={board.timezone} />
            <AttentionPanel board={board} />
          </div>

          <section className="grid gap-6 xl:grid-cols-3">
            <WorkflowPanel
              title="Arrivals"
              description="Guests expected to check in"
              bookings={board.arrivals}
              tone="arrivals"
            />
            <WorkflowPanel
              title="Departures"
              description="Guests expected to check out"
              bookings={board.departures}
              tone="departures"
            />
            <WorkflowPanel
              title="In House"
              description="Guests currently staying"
              bookings={board.inHouse}
              tone="inHouse"
            />
          </section>
        </>
      ) : (
        <EmptyState message="No front-desk data found for this business date." />
      )}
    </div>
  );
}
