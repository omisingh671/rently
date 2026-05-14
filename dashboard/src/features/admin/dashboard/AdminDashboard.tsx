import {
  FiCalendar,
  FiDollarSign,
  FiFileText,
  FiHome,
  FiKey,
  FiLayers,
  FiLink,
  FiMessageSquare,
  FiTool,
  FiUserCheck,
  FiUsers,
  FiCheckCircle,
  FiWind,
} from "react-icons/fi";
import { useAuthStore } from "@/stores/authStore";
import {
  useDashboardContext,
  useDashboardSummary,
} from "@/features/dashboard/hooks";
import { useQuery } from "@tanstack/react-query";
import { getRoomBoardApi } from "@/features/admin/operations/api";
import { ADMIN_KEYS } from "@/features/admin/config/adminKeys";
import {
  STATUS_BG_COLORS,
  STATUS_TEXT_COLORS,
  STATUS_BORDER_DARK_COLORS,
} from "@/configs/theme";
import type { IconType } from "react-icons";

type DashboardStat = {
  label: string;
  value: number;
  icon: IconType;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: context } = useDashboardContext();
  const { data: summary, isLoading, isError } = useDashboardSummary();

  const propertyId = context?.properties?.[0]?.id || "";
  const from = todayStr();
  const to = tomorrowStr();

  const boardQuery = useQuery({
    queryKey: propertyId
      ? ADMIN_KEYS.operations.roomBoard({ propertyId, from, to })
      : ["skip_board"],
    queryFn: () => getRoomBoardApi(propertyId, { from, to }),
    enabled: Boolean(propertyId),
  });

  const role = context?.user.role ?? user?.role;
  const isManager = role === "MANAGER";
  const isSuperAdmin = role === "SUPER_ADMIN";

  const operationalStats: DashboardStat[] = [
    {
      label: "Bookings",
      value: summary?.totalBookings ?? 0,
      icon: FiCalendar,
    },
    {
      label: "Pending Bookings",
      value: summary?.pendingBookings ?? 0,
      icon: FiCalendar,
    },
    {
      label: "Open Enquiries",
      value: summary?.openEnquiries ?? 0,
      icon: FiMessageSquare,
    },
    {
      label: "Open Quotes",
      value: summary?.openQuotes ?? 0,
      icon: FiFileText,
    },
  ];

  const inventoryStats: DashboardStat[] = isManager
    ? []
    : [
        {
          label: "Amenities",
          value: summary?.totalAmenities ?? 0,
          icon: FiLayers,
        },
        {
          label: "Units",
          value: summary?.totalUnits ?? 0,
          icon: FiKey,
        },
        {
          label: "Rooms",
          value: summary?.totalRooms ?? 0,
          icon: FiHome,
        },
        {
          label: "Maintenance",
          value: summary?.totalMaintenanceBlocks ?? 0,
          icon: FiTool,
        },
        {
          label: "Prices",
          value: summary?.totalRoomPricing ?? 0,
          icon: FiDollarSign,
        },
        {
          label: "Products",
          value: summary?.totalRoomProducts ?? 0,
          icon: FiDollarSign,
        },
      ];

  const adminStats: DashboardStat[] = [
    {
      label: "Properties",
      value: summary?.totalProperties ?? 0,
      icon: FiHome,
    },
    {
      label: isSuperAdmin ? "Admins" : "Managers",
      value: isSuperAdmin
        ? (summary?.totalAdmins ?? 0)
        : (summary?.totalManagers ?? 0),
      icon: isSuperAdmin ? FiUsers : FiUserCheck,
    },
    {
      label: "Assignments",
      value: summary?.totalAssignments ?? 0,
      icon: FiLink,
    },
  ];

  const stats = isManager
    ? [
        {
          label: "Assigned Properties",
          value: summary?.totalProperties ?? 0,
          icon: FiHome,
        },
        ...operationalStats,
      ]
    : [...adminStats, ...inventoryStats, ...operationalStats];

  return (
    <div className="space-y-8">
      {isError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load dashboard summary.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Left Column: Room Board */}
        <div className="w-full space-y-8">
          {/* Quick Room Board Section */}
          {propertyId && boardQuery.data?.units && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Today's Room Status
              </h3>
              <p className="text-xs text-slate-500">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date())}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {boardQuery.data.units.map((unit) => (
              <div key={unit.unitId} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <span className="text-sm font-bold uppercase tracking-wider text-slate-500">
                    Unit {unit.unitNumber}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {unit.rooms.map((room) => {
                    const bgClass =
                      STATUS_BG_COLORS[room.boardStatus] ||
                      "bg-slate-50 border-slate-100";
                    const textClass =
                      STATUS_TEXT_COLORS[room.boardStatus] || "text-slate-700";
                    const borderClass =
                      STATUS_BORDER_DARK_COLORS[room.boardStatus] ||
                      "border-slate-200";

                    let Icon = FiCheckCircle;
                    if (room.boardStatus === "OCCUPIED") Icon = FiUsers;
                    if (room.boardStatus === "RESERVED") Icon = FiCalendar;
                    if (room.boardStatus === "MAINTENANCE") Icon = FiTool;
                    if (room.boardStatus === "INACTIVE") Icon = FiWind;

                    return (
                      <div
                        key={room.roomId}
                        className={`flex-1 min-w-[100px] flex flex-col items-center justify-center rounded-xl py-6 px-4 border shadow-sm transition-all hover:shadow-md ${bgClass} ${borderClass} ${textClass}`}
                        title={`${room.roomNumber} - ${room.boardStatus}`}
                      >
                        <Icon className="mb-3 text-3xl opacity-90" />
                        <div className="flex flex-col items-center text-center">
                          <span className="text-base font-bold tracking-tight">
                            {room.roomNumber}
                          </span>
                          <span className="mt-1 text-[11px] font-medium uppercase tracking-wider opacity-70">
                            {room.roomName} • {room.hasAC ? "AC" : "Non-AC"}
                          </span>
                          <div className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                            {room.boardStatus}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
            </section>
          )}
        </div>

        {/* Right Column: Stats and Context */}
        <div className="w-full space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Performance Overview
                </h3>
                <p className="text-xs text-slate-500">
                  Key metrics and analytics
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-slate-200 bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {isLoading ? "..." : stat.value}
                  </p>
                </div>
                <div className="rounded-md bg-slate-100 p-2 text-slate-600">
                  <stat.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Dashboard Context
            </h3>
          </div>

          <div className="flex flex-col gap-6 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Role
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {context?.user.role ?? user?.role ?? "Unknown"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {context?.modules.length ?? 0} enabled dashboard modules
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Accessible Properties
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(context?.properties ?? []).length === 0 ? (
                  <span className="text-sm text-slate-500">
                    No properties assigned yet.
                  </span>
                ) : (
                  (context?.properties ?? []).map((property) => (
                    <span
                      key={property.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {property.name}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
          </section>
        </div>
      </div>
    </div>
  );
}
