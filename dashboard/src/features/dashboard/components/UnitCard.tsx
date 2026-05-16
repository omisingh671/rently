import type { RoomBoardUnit } from "@/features/operations/types";
import { countAvailableRooms } from "../dashboard.helpers";
import { RoomCard } from "./RoomCard";

type UnitCardProps = {
  unit: RoomBoardUnit;
};

export function UnitCard({ unit }: UnitCardProps) {
  const availableCount = countAvailableRooms(unit);

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Unit {unit.unitNumber}
          </h4>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Floor {unit.floor} • {availableCount} Available
          </p>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {unit.rooms.length} Room{unit.rooms.length === 1 ? "" : "s"}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        {unit.rooms.map((room) => (
          <RoomCard key={room.roomId} room={room} />
        ))}
      </div>
    </article>
  );
}
