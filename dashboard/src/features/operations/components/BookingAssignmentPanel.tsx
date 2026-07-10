import { FiHome } from "react-icons/fi";
import { getAssignedLabel } from "../bookingDisplay";
import type { AdminBooking } from "../types";

type BookingAssignmentPanelProps = {
  booking: AdminBooking;
};

export function BookingAssignmentPanel({
  booking,
}: BookingAssignmentPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">
        Current Assignment
      </h3>
      <div className="mt-4 flex items-center gap-3.5 text-slate-700">
        <span className="rounded-lg bg-slate-100 p-2 text-slate-600 shrink-0">
          <FiHome size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            Assigned Unit & Room
          </span>
          <span className="text-sm font-semibold text-slate-800">
            {getAssignedLabel(booking)}
          </span>
        </div>
      </div>
    </section>
  );
}
