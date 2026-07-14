import type { ReactNode } from "react";
import {
  FiAlertTriangle,
  FiCreditCard,
  FiEdit3,
  FiHome,
  FiLogIn,
  FiLogOut,
  FiSlash,
} from "react-icons/fi";
import { formatMoney } from "../bookingDisplay";
import type { AdminBooking } from "../types";

type BookingStatusPanelProps = {
  booking: AdminBooking;
  canCheckIn: boolean;
  canCheckOut: boolean;
  canRecordBalance: boolean;
  canAssignRoom: boolean;
  canUseAdminCorrection: boolean;
  canMarkNoShow: boolean;
  canCancel: boolean;
  canOverrideCheckedInRoom: boolean;
  isMutating: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onRecordPayment: () => void;
  onAssignRoom: () => void;
  onStatusOverride: () => void;
  onNoShow: () => void;
  onCancel: () => void;
};

export function BookingStatusPanel({
  booking,
  canCheckIn,
  canCheckOut,
  canRecordBalance,
  canAssignRoom,
  canUseAdminCorrection,
  canMarkNoShow,
  canCancel,
  canOverrideCheckedInRoom,
  isMutating,
  onCheckIn,
  onCheckOut,
  onRecordPayment,
  onAssignRoom,
  onStatusOverride,
  onNoShow,
  onCancel,
}: BookingStatusPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-900">
          Operational Actions
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Manage guest stay lifecycle and room allocations.
        </p>
      </div>

      <div className="grid gap-2.5">
        {canCheckIn && (
          <ActionButton
            theme="emerald"
            icon={<FiLogIn />}
            disabled={isMutating}
            onClick={onCheckIn}
          >
            Check In
          </ActionButton>
        )}
        {canCheckOut && (
          <ActionButton
            theme="slate"
            icon={<FiLogOut />}
            disabled={isMutating}
            onClick={onCheckOut}
          >
            Check Out
          </ActionButton>
        )}
        {canRecordBalance && (
          <ActionButton
            theme="indigo"
            icon={<FiCreditCard />}
            disabled={isMutating}
            onClick={onRecordPayment}
          >
            Record Balance Payment
          </ActionButton>
        )}
        {canAssignRoom && (
          <ActionButton
            theme="sky"
            icon={<FiHome />}
            disabled={isMutating}
            onClick={onAssignRoom}
          >
            {booking.items.length > 1
              ? "Change Rooms"
              : booking.targetType === "UNIT"
                ? "Change Unit"
                : booking.roomId !== null
                  ? "Change Room"
                  : "Assign Room"}
          </ActionButton>
        )}
        {canUseAdminCorrection && (
          <ActionButton
            theme="orange"
            icon={<FiEdit3 />}
            disabled={isMutating}
            onClick={onStatusOverride}
          >
            Fix Status Mistake
          </ActionButton>
        )}
        {canMarkNoShow && (
          <ActionButton
            theme="amber"
            icon={<FiAlertTriangle />}
            disabled={isMutating}
            onClick={onNoShow}
          >
            Mark No-Show
          </ActionButton>
        )}
        {canCancel && (
          <ActionButton
            theme="rose"
            icon={<FiSlash />}
            disabled={isMutating}
            onClick={onCancel}
          >
            Cancel Booking
          </ActionButton>
        )}
      </div>

      {booking.status === "CONFIRMED" && booking.noShowEligible && (
        <div className="mt-3 rounded-md bg-amber-50/60 border border-amber-250 p-2 text-xs font-semibold text-amber-850 flex items-center gap-1.5">
          <FiAlertTriangle className="text-amber-500" />
          <span>No-show eligible</span>
        </div>
      )}
      {booking.status === "CHECKED_IN" && !canOverrideCheckedInRoom && (
        <p className="mt-3 text-xs text-slate-500 leading-normal italic">
          Room changes after check-in require confirmation and an audit note.
        </p>
      )}
      {(booking.status === "CANCELLED" || booking.status === "NO_SHOW") &&
        Number(booking.refundableAmount) > 0 && (
          <div className="mt-3 rounded-md bg-indigo-50/60 border border-indigo-250 p-2 text-xs font-semibold text-indigo-850 flex items-center gap-1.5 animate-pulse">
            <span>Refundable balance: {formatMoney(booking.refundableAmount)}</span>
          </div>
        )}
    </section>
  );
}

type ActionButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  children: ReactNode;
  theme: "indigo" | "sky" | "emerald" | "slate" | "amber" | "rose" | "orange";
};

function ActionButton({
  onClick,
  disabled = false,
  icon,
  children,
  theme,
}: ActionButtonProps) {
  const themeClasses: Record<ActionButtonProps["theme"], string> = {
    indigo:
      "border-indigo-200 bg-indigo-50/45 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 hover:shadow-xs focus:ring-indigo-400/30",
    sky: "border-sky-200 bg-sky-50/45 text-sky-700 hover:bg-sky-50 hover:border-sky-300 hover:text-sky-800 hover:shadow-xs focus:ring-sky-400/30",
    emerald:
      "border-emerald-200 bg-emerald-50/45 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 hover:shadow-xs focus:ring-emerald-400/30",
    slate:
      "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900 hover:shadow-xs focus:ring-slate-400/30",
    amber:
      "border-amber-200 bg-amber-50/45 text-amber-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 hover:shadow-xs focus:ring-amber-400/30",
    rose: "border-rose-200 bg-rose-50/45 text-rose-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800 hover:shadow-xs focus:ring-rose-400/30",
    orange:
      "border-orange-200 bg-orange-50/45 text-orange-700 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-800 hover:shadow-xs focus:ring-orange-400/30",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full inline-flex items-center justify-center gap-2.5 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold cursor-pointer
        transition-all duration-200 ease-in-out
        hover:-translate-y-0.5 active:translate-y-0
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none
        ${themeClasses[theme]}
      `}
    >
      <span className="shrink-0 text-lg">{icon}</span>
      <span>{children}</span>
    </button>
  );
}
