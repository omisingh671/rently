import { ICON_REGISTRY } from "@/configs/iconRegistry";
import {
  STATUS_BG_COLORS,
  STATUS_BORDER_DARK_COLORS,
  STATUS_TEXT_COLORS,
} from "@/configs/theme";
import type { RoomBoardStatus } from "@/features/operations/types";

const { FiCheckCircle, FiClock, FiGrid, FiSlash, FiTool, FiUsers } =
  ICON_REGISTRY;

const summaryStatuses: Array<{ value: RoomBoardStatus; label: string }> = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INACTIVE", label: "Inactive" },
];

const statusActiveRingColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "ring-emerald-200/70",
  RESERVED: "ring-amber-200/70",
  OCCUPIED: "ring-indigo-200/70",
  MAINTENANCE: "ring-rose-200/70",
  INACTIVE: "ring-slate-200/80",
};

const statusIconMutedColors: Record<RoomBoardStatus, string> = {
  AVAILABLE: "text-emerald-700/20",
  RESERVED: "text-amber-700/20",
  OCCUPIED: "text-indigo-700/20",
  MAINTENANCE: "text-rose-700/20",
  INACTIVE: "text-slate-700/20",
};

const activeStyles: Record<RoomBoardStatus, string> = {
  AVAILABLE:
    "bg-emerald-600 border-emerald-600 text-white shadow-emerald-200/50",
  RESERVED: "bg-amber-600 border-amber-600 text-white shadow-amber-200/50",
  OCCUPIED:
    "bg-indigo-600 border-indigo-600 text-white shadow-indigo-200/50",
  MAINTENANCE: "bg-rose-600 border-rose-600 text-white shadow-rose-200/50",
  INACTIVE: "bg-slate-700 border-slate-700 text-white shadow-slate-200/50",
};

const statusIconMap: Record<RoomBoardStatus, React.ReactNode> = {
  AVAILABLE: <FiCheckCircle size={32} />,
  RESERVED: <FiClock size={32} />,
  OCCUPIED: <FiUsers size={32} />,
  MAINTENANCE: <FiTool size={32} />,
  INACTIVE: <FiSlash size={32} />,
};

interface RoomBoardSummaryCardsProps {
  summary?: Record<RoomBoardStatus, number>;
  totalRooms: number;
  selectedStatus: RoomBoardStatus | "";
  onShowAll: () => void;
  onToggleStatus: (status: RoomBoardStatus) => void;
}

export default function RoomBoardSummaryCards({
  summary,
  totalRooms,
  selectedStatus,
  onShowAll,
  onToggleStatus,
}: RoomBoardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      <button
        type="button"
        onClick={onShowAll}
        className={`flex items-center justify-between rounded-lg border px-5 py-4 text-left transition-all duration-200 active:translate-y-0 ${
          selectedStatus === ""
            ? "border-slate-800 bg-slate-800 text-white shadow-md ring-2 ring-slate-200"
            : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
        }`}
      >
        <div className="min-w-0 flex-1">
          <span
            className={`block text-[10px] font-bold uppercase tracking-wider ${selectedStatus === "" ? "text-slate-300" : "text-slate-500"}`}
          >
            Total
          </span>
          <span className="mt-0.5 block text-2xl font-bold leading-tight">
            {totalRooms}
          </span>
        </div>
        <FiGrid
          className={
            selectedStatus === "" ? "text-white/40" : "text-slate-200"
          }
          size={32}
        />
      </button>

      {summaryStatuses.map((item) => {
        const count = summary?.[item.value] ?? 0;
        const bgClass = STATUS_BG_COLORS[item.value] || "bg-white";
        const borderClass =
          STATUS_BORDER_DARK_COLORS[item.value] || "border-slate-200";
        const textClass = STATUS_TEXT_COLORS[item.value] || "text-slate-700";
        const ringClass = statusActiveRingColors[item.value];
        const isActive = selectedStatus === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onToggleStatus(item.value)}
            className={`flex items-center justify-between rounded-lg border px-5 py-4 text-left transition-all duration-200 active:translate-y-0 ${
              isActive
                ? `${activeStyles[item.value]} shadow-lg ring-2 ${ringClass}`
                : `${bgClass} ${borderClass} ${textClass} hover:-translate-y-0.5 hover:shadow-md`
            }`}
          >
            <div className="min-w-0 flex-1">
              <span
                className={`block truncate text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-white/80" : ""}`}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block text-2xl font-bold leading-tight">
                {count}
              </span>
            </div>
            <span
              className={
                isActive ? "text-white/40" : statusIconMutedColors[item.value]
              }
            >
              {statusIconMap[item.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
