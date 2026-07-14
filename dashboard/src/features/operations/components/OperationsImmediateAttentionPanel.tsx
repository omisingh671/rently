import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { FiAlertTriangle, FiCheck, FiClock, FiTool } from "react-icons/fi";
import type { OperationsBoardResponse } from "../types";

type OperationsImmediateAttentionPanelProps = {
  board: OperationsBoardResponse | undefined;
};

export function OperationsImmediateAttentionPanel({
  board,
}: OperationsImmediateAttentionPanelProps) {
  const hasExceptions =
    board !== undefined &&
    board.lateArrivals.length +
      board.unassignedArrivals.length +
      board.maintenanceConflicts.length >
      0;

  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Immediate attention
      </h3>
      <div className="mt-4 max-h-[300px] space-y-3 overflow-y-auto pr-2">
        {hasExceptions ? (
          <>
            {board.lateArrivals.map((booking) => (
              <a
                key={`late-${booking.id}`}
                href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-amber-500 border-amber-200 bg-amber-50/15 px-3.5 py-2.5 text-amber-900 transition-all duration-200 hover:-translate-x-0.5 hover:bg-amber-50/40 hover:shadow-xs"
              >
                <FiClock className="h-4.5 w-4.5 shrink-0 text-amber-600" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold tracking-tight text-amber-950">
                    Late Arrival Alert
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-amber-800">
                    Ref:{" "}
                    <span className="rounded border border-amber-200/50 bg-amber-100/60 px-1 py-0.5 font-mono text-amber-950">
                      {booking.bookingRef}
                    </span>{" "}
                    • {booking.guestName}
                  </div>
                </div>
              </a>
            ))}

            {board.unassignedArrivals.map((booking) => (
              <a
                key={`unassigned-${booking.id}`}
                href={adminPath(ADMIN_ROUTES.BOOKING_DETAIL(booking.id))}
                className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-rose-500 border-rose-200 bg-rose-50/15 px-3.5 py-2.5 text-rose-900 transition-all duration-200 hover:-translate-x-0.5 hover:bg-rose-50/40 hover:shadow-xs"
              >
                <FiAlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-600" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold tracking-tight text-rose-950">
                    Room Assignment Required
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-rose-800">
                    Ref:{" "}
                    <span className="rounded border border-rose-200/50 bg-rose-100/60 px-1 py-0.5 font-mono text-rose-950">
                      {booking.bookingRef}
                    </span>{" "}
                    • {booking.guestName || "Guest"}
                  </div>
                </div>
              </a>
            ))}

            {board.maintenanceConflicts.map((conflict) => (
              <div
                key={`${conflict.maintenanceId}-${conflict.booking.id}`}
                className="flex items-center gap-3 rounded-lg border-y border-r border-l-4 border-l-red-650 border-red-200 bg-red-50/15 px-3.5 py-2.5 text-red-900 shadow-2xs"
              >
                <FiTool className="h-4.5 w-4.5 shrink-0 text-red-600" />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold tracking-tight text-red-950">
                    {formatEnumLabel(conflict.priority)} Maintenance Conflict
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-red-800">
                    Room block affects booking Ref:{" "}
                    <span className="rounded border border-red-200/50 bg-red-100/60 px-1 py-0.5 font-mono text-red-950">
                      {conflict.booking.bookingRef}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 border-l-4 border-l-emerald-600 bg-emerald-50/15 p-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-emerald-700/50 bg-emerald-600 text-sm font-extrabold text-white">
              <FiCheck className="h-4 w-4" />
            </div>
            <div className="text-xs font-bold leading-tight text-emerald-950">
              No urgent operational exceptions.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
