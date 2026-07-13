import type { ReactNode } from "react";
import {
  FiAlertTriangle,
  FiClock,
  FiClipboard,
  FiDollarSign,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiRefreshCw,
  FiTool,
} from "react-icons/fi";
import { OPERATION_PALETTE } from "../operationPalette";
import type { OperationsBoardResponse } from "../types";

type SummaryItem = {
  label: string;
  value: number;
  icon: ReactNode;
  tone: (typeof OPERATION_PALETTE)[keyof typeof OPERATION_PALETTE];
  description: string;
};

type OperationsSummaryCardsProps = {
  summary: OperationsBoardResponse["summary"];
};

export function OperationsSummaryCards({
  summary,
}: OperationsSummaryCardsProps) {
  const items: SummaryItem[] = [
    {
      label: "Arrivals",
      value: summary.arrivals,
      icon: (
        <FiLogIn className={`h-3.5 w-3.5 ${OPERATION_PALETTE.arrivals.icon}`} />
      ),
      tone: OPERATION_PALETTE.arrivals,
      description: "Expected check-ins today",
    },
    {
      label: "Departures",
      value: summary.departures,
      icon: (
        <FiLogOut
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.departures.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.departures,
      description: "Expected check-outs today",
    },
    {
      label: "In house",
      value: summary.inHouse,
      icon: (
        <FiHome className={`h-3.5 w-3.5 ${OPERATION_PALETTE.inHouse.icon}`} />
      ),
      tone: OPERATION_PALETTE.inHouse,
      description: "Guests currently staying",
    },
    {
      label: "Late arrivals",
      value: summary.lateArrivals,
      icon: (
        <FiClock className={`h-3.5 w-3.5 ${OPERATION_PALETTE.late.icon}`} />
      ),
      tone: OPERATION_PALETTE.late,
      description: "Missed scheduled check-in",
    },
    {
      label: "Unassigned",
      value: summary.unassignedArrivals,
      icon: (
        <FiAlertTriangle
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.unassigned.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.unassigned,
      description: "Needs room assignment",
    },
    {
      label: "Balance due",
      value: summary.balanceDue,
      icon: (
        <FiDollarSign
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.balance.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.balance,
      description: "Bookings with outstanding dues",
    },
    {
      label: "Housekeeping",
      value: summary.housekeeping,
      icon: (
        <FiClipboard
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.housekeeping.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.housekeeping,
      description: "Dirty or cleaning rooms",
    },
    {
      label: "Refund attention",
      value: summary.refundAttention,
      icon: (
        <FiRefreshCw
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.refunds.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.refunds,
      description: "Active refund requests",
    },
    {
      label: "Maintenance",
      value: summary.maintenanceConflicts,
      icon: (
        <FiTool
          className={`h-3.5 w-3.5 ${OPERATION_PALETTE.maintenance.icon}`}
        />
      ),
      tone: OPERATION_PALETTE.maintenance,
      description: "Maintenance conflicts",
    },
  ];

  return (
    <div className="grid gap-2.5 p-4 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className={`rounded-lg border p-2.5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default ${item.tone.card}`}
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="space-y-0.5">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider ${item.tone.label}`}
              >
                {item.label}
              </span>
              <div
                className={`text-2xl font-black leading-none ${item.tone.value}`}
              >
                {item.value}
              </div>
            </div>
            <div
              className={`rounded-md border p-1.5 shrink-0 ${item.tone.iconBox}`}
            >
              {item.icon}
            </div>
          </div>
          <p
            className={`mt-1.5 text-[9px] font-medium leading-tight ${item.tone.muted}`}
          >
            {item.description}
          </p>
        </div>
      ))}
    </div>
  );
}
