import StatusBadge from "@/components/common/StatusBadge";
import { ICON_REGISTRY } from "@/configs/iconRegistry";
import {
  STATUS_BG_COLORS,
  STATUS_BORDER_DARK_COLORS,
  STATUS_INNER_BORDER_COLORS,
  STATUS_TEXT_COLORS,
} from "@/configs/theme";
import type {
  RoomBoardRoom,
  RoomBoardStatus,
  RoomBoardUnit,
  RoomHousekeepingStatus,
} from "@/features/operations/types";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const { FiCalendar, FiCheckCircle, FiClock, FiTool, FiUsers } = ICON_REGISTRY;

const unitHeaderColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "border-emerald-200 bg-emerald-50/70",
  RESERVED: "border-amber-200 bg-amber-50/70",
  OCCUPIED: "border-indigo-200 bg-indigo-50/70",
  MAINTENANCE: "border-rose-200 bg-rose-50/70",
  INACTIVE: "border-slate-200 bg-slate-50/80",
};

const roomBoardStatuses: RoomBoardStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "MAINTENANCE",
  "INACTIVE",
];

const isRoomBoardStatus = (value: string): value is RoomBoardStatus =>
  roomBoardStatuses.some((status) => status === value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatInclusiveEndDate = (value: string) => {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - 1);
  return formatDate(date.toISOString());
};

const nextHousekeepingStatus: Partial<
  Record<RoomHousekeepingStatus, RoomHousekeepingStatus>
> = {
  DIRTY: "CLEANING",
  CLEANING: "CLEAN",
  CLEAN: "INSPECTED",
};

interface RoomBoardUnitSectionProps {
  unit: RoomBoardUnit;
  isUpdating: boolean;
  onHousekeepingChange: (
    room: RoomBoardRoom,
    status: RoomHousekeepingStatus,
  ) => void;
}

export default function RoomBoardUnitSection({
  unit,
  isUpdating,
  onHousekeepingChange,
}: RoomBoardUnitSectionProps) {
  const unitStatus = isRoomBoardStatus(unit.status) ? unit.status : "INACTIVE";
  const borderClass =
    STATUS_BORDER_DARK_COLORS[unitStatus] || "border-slate-300";
  const headerClass =
    unitHeaderColors[unitStatus] || "border-slate-200 bg-slate-50";
  const textClass = STATUS_TEXT_COLORS[unitStatus] || "text-slate-700";

  return (
    <section className={`rounded-lg border bg-white ${borderClass}`}>
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-t-lg border-b px-5 py-4 ${headerClass}`}
      >
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Unit {unit.unitNumber}
          </h3>
          <div className={`mt-1 flex items-center gap-2 text-xs ${textClass}`}>
            <span className="font-semibold">Floor {unit.floor}</span>
            <span>•</span>
            {!unit.isActive ? (
              <StatusBadge
                status="DISABLED"
                variantMap={{ DISABLED: "bg-rose-100 text-rose-700" }}
              />
            ) : (
              <StatusBadge status={unit.status} />
            )}
          </div>
        </div>
        <div className={`text-sm font-bold ${textClass}`}>
          {unit.rooms.length} Room{unit.rooms.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-5">
        {unit.rooms.map((room) => (
          <RoomTile
            key={room.roomId}
            room={room}
            isUpdating={isUpdating}
            onHousekeepingChange={onHousekeepingChange}
          />
        ))}
      </div>
    </section>
  );
}

interface RoomTileProps {
  room: RoomBoardRoom;
  isUpdating: boolean;
  onHousekeepingChange: (
    room: RoomBoardRoom,
    status: RoomHousekeepingStatus,
  ) => void;
}

function RoomTile({
  room,
  isUpdating,
  onHousekeepingChange,
}: RoomTileProps) {
  const tone =
    STATUS_BG_COLORS[room.boardStatus] || "bg-white border-slate-200";
  const innerBorder =
    STATUS_INNER_BORDER_COLORS[room.boardStatus] || "border-slate-200";
  const textTheme = STATUS_TEXT_COLORS[room.boardStatus] || "text-slate-700";
  const nextStatus = nextHousekeepingStatus[room.housekeepingStatus];

  return (
    <article
      className={`flex min-h-40 min-w-62.5 flex-1 flex-col justify-between rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${tone}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-slate-900">
            {room.roomNumber}
          </div>
          <div
            className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${textTheme}`}
          >
            <span>{room.roomName}</span>
            <span>•</span>
            <span>{room.hasAC ? "AC" : "Non-AC"}</span>
            <span>•</span>
            <span>Cap: {room.maxOccupancy}</span>
          </div>
        </div>
        <StatusBadge status={room.boardStatus} />
      </div>

      <div className="mt-auto space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2">
          <span className="font-semibold text-slate-700">
            Housekeeping: {room.housekeepingStatus}
          </span>
          {nextStatus && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onHousekeepingChange(room, nextStatus)}
              className="font-bold text-indigo-700 hover:underline disabled:opacity-50"
            >
              Mark {formatEnumLabel(nextStatus)}
            </button>
          )}
        </div>
        {room.booking && (
          <div
            className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}
          >
            <div className="flex items-center gap-2 font-bold">
              <FiUsers className="shrink-0" /> {room.booking.guestName}
            </div>
            <div className="mt-2 font-bold">Ref: {room.booking.bookingRef}</div>
            <div className="mt-2 flex items-center gap-1.5 font-bold">
              <FiClock className="shrink-0" />
              {formatDate(room.booking.checkIn)} to{" "}
              {formatDate(room.booking.checkOut)}
            </div>
          </div>
        )}
        {room.maintenance && (
          <div
            className={`rounded-lg border bg-transparent p-3 ${innerBorder} ${textTheme}`}
          >
            <div className="flex items-center gap-2 font-bold">
              <FiTool className="shrink-0" /> {room.maintenance.reason}
            </div>
            <div className="mt-2 flex items-center gap-1.5 font-bold">
              <FiCalendar className="shrink-0" />
              {formatDate(room.maintenance.startDate)} to{" "}
              {formatInclusiveEndDate(room.maintenance.endDate)}
            </div>
          </div>
        )}
        {!room.booking && !room.maintenance && (
          <div
            className={`flex items-center gap-2 rounded-lg border bg-transparent p-3 font-bold ${innerBorder} ${textTheme}`}
          >
            <FiCheckCircle className="shrink-0" />
            {room.reason ?? "Ready"}
          </div>
        )}
      </div>
    </article>
  );
}
