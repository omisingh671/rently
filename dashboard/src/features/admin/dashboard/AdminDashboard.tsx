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
} from "react-icons/fi";
import { useAuthStore } from "@/stores/authStore";
import { useDashboardContext, useDashboardSummary } from "@/features/dashboard/hooks";
import type { IconType } from "react-icons";

type DashboardStat = {
  label: string;
  value: number;
  icon: IconType;
};

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: context } = useDashboardContext();
  const { data: summary, isLoading, isError } = useDashboardSummary();

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

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid gap-6 px-6 py-5 lg:grid-cols-2">
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
  );
}
