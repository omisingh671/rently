import { useMemo, useState } from "react";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import type { CashierSummaryResponse } from "../types";

type OperationsCashierPanelProps = {
  rows: CashierSummaryResponse["rows"];
  timezone?: string;
};

export function OperationsCashierPanel({
  rows,
  timezone,
}: OperationsCashierPanelProps) {
  const [expandedEmployeeKey, setExpandedEmployeeKey] = useState<string | null>(
    null,
  );
  const totals = useMemo(() => {
    let expectedCash = 0;
    let refunds = 0;
    let netCollected = 0;

    rows.forEach((row) => {
      expectedCash += row.expectedCash;
      refunds += row.refunds;
      netCollected += row.netCollected;
    });

    return { expectedCash, refunds, netCollected };
  }, [rows]);

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Cashier by employee
      </h3>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border-l-4 border-l-indigo-600 border border-slate-300 bg-indigo-50/15 p-2.5 gap-3 transition-all duration-200">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-indigo-600 text-white font-extrabold text-sm border border-indigo-700/50">
                  Î£
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 leading-tight">
                    <span className="font-bold text-xs text-indigo-950">
                      Grand Total
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      Expected Cash:{" "}
                      <strong className="text-slate-700 font-semibold">
                        {formatMoney(totals.expectedCash)}
                      </strong>
                    </span>
                    <span className="text-slate-300">â€¢</span>
                    <span className="flex items-center gap-1">
                      Refunds:{" "}
                      <strong className="text-rose-600 font-semibold">
                        {formatMoney(totals.refunds)}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-indigo-200/50 pt-2 sm:pt-0 sm:pl-3 gap-1">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-indigo-500/80">
                    Net Collected
                  </div>
                  <div
                    className={`text-lg font-black tracking-tight ${
                      totals.netCollected >= 0
                        ? "text-emerald-600"
                        : "text-rose-600"
                    } leading-none`}
                  >
                    {formatMoney(totals.netCollected)}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-1.5 border-t border-dashed border-slate-200">
              {rows.map((row) => {
                const employeeKey = row.receivedByUserId ?? "SYSTEM";
                const isExpanded = expandedEmployeeKey === employeeKey;
                return (
                  <div
                    key={employeeKey}
                    className="flex flex-col rounded-lg border border-slate-300 bg-white hover:border-slate-400 transition-all duration-200"
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-3 cursor-pointer select-none"
                      onClick={() =>
                        setExpandedEmployeeKey(isExpanded ? null : employeeKey)
                      }
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
                            {Object.entries(row.byMethod).map(
                              ([method, amount]) => (
                                <span
                                  key={method}
                                  className="inline-flex items-center rounded bg-slate-50 border border-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wider"
                                >
                                  {formatEnumLabel(method)}:{" "}
                                  {formatMoney(amount)}
                                </span>
                              ),
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              Expected Cash:{" "}
                              <strong className="text-slate-700 font-semibold">
                                {formatMoney(row.expectedCash)}
                              </strong>
                            </span>
                            <span className="text-slate-300">â€¢</span>
                            <span className="flex items-center gap-1">
                              Refunds:{" "}
                              <strong className="text-rose-600 font-semibold">
                                {formatMoney(row.refunds)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 gap-1">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Net Collected
                          </div>
                          <div
                            className={`text-lg font-black tracking-tight ${
                              row.netCollected >= 0
                                ? "text-emerald-600"
                                : "text-rose-600"
                            } leading-none`}
                          >
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

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-b-lg">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 mb-2">
                          Payment History ({row.history?.length ?? 0})
                        </h4>
                        {row.history && row.history.length > 0 ? (
                          <div className="space-y-1.5 max-h-[180px] overflow-y-auto overscroll-contain pr-2">
                            {row.history.map((transaction) => (
                              <div
                                key={transaction.id}
                                className="flex items-center justify-between rounded bg-white border border-slate-200 p-2 text-xs gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border ${
                                      transaction.type === "PAYMENT"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                                        : "bg-rose-50 text-rose-700 border-rose-200/60"
                                    }`}
                                  >
                                    {transaction.type}
                                  </span>
                                  <a
                                    href={adminPath(
                                      ADMIN_ROUTES.BOOKING_DETAIL(
                                        transaction.bookingId,
                                      ),
                                    )}
                                    className="font-bold font-mono text-indigo-600 hover:text-indigo-855 hover:underline shrink-0"
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    {transaction.bookingRef}
                                  </a>
                                  <span className="text-slate-300 shrink-0">
                                    |
                                  </span>
                                  <span className="text-slate-700 truncate font-semibold">
                                    {transaction.guestName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[9px] font-semibold text-slate-400">
                                    {formatTransactionTime(
                                      transaction.time,
                                      timezone,
                                    )}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    {formatEnumLabel(transaction.method)}
                                  </span>
                                  <span
                                    className={`font-extrabold ${
                                      transaction.type === "PAYMENT"
                                        ? "text-slate-900"
                                        : "text-rose-600"
                                    }`}
                                  >
                                    {transaction.type === "PAYMENT" ? "" : "-"}
                                    {formatMoney(transaction.amount)}
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
  );
}

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
