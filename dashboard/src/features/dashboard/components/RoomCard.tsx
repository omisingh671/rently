import {
  FiCalendar,
  FiCheckCircle,
  FiCloudSnow,
  FiTool,
  FiUsers,
  FiWind,
} from "react-icons/fi";
import {
  STATUS_BG_COLORS,
  STATUS_BORDER_DARK_COLORS,
  STATUS_TEXT_COLORS,
} from "@/configs/theme";
import type {
  RoomBoardRoom,
  RoomBoardStatus,
} from "@/features/operations/types";
import { statusLabel } from "../dashboard.helpers";

const statusIcons: Record<RoomBoardStatus, typeof FiCheckCircle> = {
  AVAILABLE: FiCheckCircle,
  RESERVED: FiCalendar,
  OCCUPIED: FiUsers,
  MAINTENANCE: FiTool,
  INACTIVE: FiWind,
};

type RoomCardProps = {
  room: RoomBoardRoom;
};

export function RoomCard({ room }: RoomCardProps) {
  const Icon = statusIcons[room.boardStatus];
  const bgClass = STATUS_BG_COLORS[room.boardStatus] || "bg-slate-50";
  const textClass = STATUS_TEXT_COLORS[room.boardStatus] || "text-slate-700";
  const borderClass =
    STATUS_BORDER_DARK_COLORS[room.boardStatus] || "border-slate-200";
  const iconPulse =
    room.boardStatus === "OCCUPIED" ? "animate-pulse text-indigo-700" : "";

  return (
    <article
      className={`flex min-h-[132px] min-w-[112px] flex-1 flex-col justify-between rounded-xl border px-4 py-4 shadow-sm transition-all hover:shadow-md ${bgClass} ${borderClass} ${textClass}`}
      title={`${room.roomNumber} - ${statusLabel(room.boardStatus)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Icon className={`text-2xl opacity-90 ${iconPulse}`} />
        {room.hasAC ? (
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/70 text-sky-700 shadow-sm"
            title="AC room"
            aria-label="AC room"
          >
            <FiCloudSnow className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      <div className="mt-4">
        <div className="text-lg font-bold tracking-tight text-slate-950">
          {room.roomNumber}
        </div>
        <div className="mt-1 truncate text-xs font-semibold opacity-80">
          {room.roomName}
        </div>
        <div className="mt-2 truncate text-[10px] font-bold uppercase tracking-widest opacity-80">
          {statusLabel(room.boardStatus)}
        </div>
      </div>
    </article>
  );
}
