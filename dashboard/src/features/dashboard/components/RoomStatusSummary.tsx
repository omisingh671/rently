import { ICON_REGISTRY } from "@/configs/iconRegistry";
const { FiArrowRight } = ICON_REGISTRY;
import Button from "@/components/ui/Button";
import {
  STATUS_BG_COLORS,
  STATUS_BORDER_DARK_COLORS,
  STATUS_TEXT_COLORS,
} from "@/configs/theme";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import type {
  RoomBoardResponse,
  RoomBoardStatus,
} from "@/features/operations/types";
import { getTotalRooms, statusLabel } from "../dashboard.helpers";
import { DashboardWidgetCard } from "./DashboardWidgetCard";

const statusOrder: RoomBoardStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "MAINTENANCE",
  "INACTIVE",
];

type RoomStatusSummaryProps = {
  board: RoomBoardResponse;
};

export function RoomStatusSummary({ board }: RoomStatusSummaryProps) {
  const totalRooms = getTotalRooms(board);

  return (
    <DashboardWidgetCard
      title="Today's Room Status"
      subtitle={`${totalRooms} total rooms across today's board`}
      action={
        <Button
          size="sm"
          variant="secondary"
          to={adminPath(ADMIN_ROUTES.ROOM_BOARD)}
          iconRight={<FiArrowRight />}
        >
          View Room Board
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 2xl:grid-cols-5">
        {statusOrder.map((status) => {
          const count = board.summary[status] ?? 0;
          const bgClass = STATUS_BG_COLORS[status] || "bg-slate-50";
          const borderClass =
            STATUS_BORDER_DARK_COLORS[status] || "border-slate-200";
          const textClass = STATUS_TEXT_COLORS[status] || "text-slate-700";

          return (
            <article
              key={status}
              className={`rounded-xl border px-3 py-3 ${bgClass} ${borderClass}`}
            >
              <p
                title={statusLabel(status)}
                className={`truncate text-[10px] font-bold uppercase tracking-wide ${textClass}`}
              >
                {statusLabel(status)}
              </p>
              <p className={`mt-2 text-2xl font-bold ${textClass}`}>
                {count}
              </p>
            </article>
          );
        })}
      </div>
    </DashboardWidgetCard>
  );
}
