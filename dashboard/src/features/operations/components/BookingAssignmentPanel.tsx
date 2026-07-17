import { FiHome } from "react-icons/fi";
import { getAssignedLabel } from "../bookingDisplay";
import type { AdminBooking } from "../types";

type BookingAssignmentPanelProps = {
  booking: AdminBooking;
};

export function BookingAssignmentPanel({
  booking,
}: BookingAssignmentPanelProps) {
  const allocationSourceLabels: Record<
    AdminBooking["roomAllocationHistory"][number]["source"],
    string
  > = {
    BOOKING_CREATED: "Booking created",
    ROOM_ASSIGNED: "Room assigned",
    CHECK_IN_ASSIGNED: "Check-in assignment",
    ROOM_MOVE: "Room move",
  };

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
      {booking.roomAllocationHistory.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Allocation History
          </h4>
          <div className="mt-3 space-y-2">
            {booking.roomAllocationHistory.map((allocation) => (
              <div
                key={allocation.id}
                className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-800">
                    Unit {allocation.unitNumber} / Room {allocation.roomNumber}
                  </span>
                  <span className="text-slate-500">
                    {allocation.effectiveTo === null ? "Current" : "Closed"}
                  </span>
                </div>
                <div className="mt-1 text-slate-500">
                  {new Date(allocation.effectiveFrom).toLocaleString()} –{" "}
                  {allocation.effectiveTo
                    ? new Date(allocation.effectiveTo).toLocaleString()
                    : "ongoing"}
                </div>
                <div className="mt-1 text-slate-400">
                  {allocationSourceLabels[allocation.source]}
                  {allocation.actorName ? ` by ${allocation.actorName}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
