import type { ReactNode } from "react";
import { ICON_REGISTRY } from "@/configs/iconRegistry";

const { FiActivity, FiCalendar, FiLogIn, FiLogOut } = ICON_REGISTRY;

type DashboardStatsProps = {
  occupancyRate: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  healthIssues: number;
  isLoading: boolean;
};

type StatCard = {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  iconTone: string;
  valueTone: string;
  railTone: string;
  chipTone: string;
  bgGradient: string;
};

export function DashboardStats({
  occupancyRate,
  todayCheckIns,
  todayCheckOuts,
  healthIssues,
  isLoading,
}: DashboardStatsProps) {
  const stats: StatCard[] = [
    {
      label: "Occupancy Rate",
      value: `${occupancyRate}%`,
      helper: "Occupied rooms today",
      icon: <FiActivity />,
      iconTone: "bg-gradient-to-br from-[#33365b] to-[#45497a] text-white",
      valueTone: "text-[#33365b]",
      railTone: "bg-gradient-to-b from-[#33365b] to-[#45497a]",
      chipTone: "bg-[#33365b]/10 text-[#33365b]",
      bgGradient: "from-slate-50/50 to-white",
    },
    {
      label: "Today's Check-ins",
      value: String(todayCheckIns),
      helper: "Arrivals due today",
      icon: <FiLogIn />,
      iconTone: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white",
      valueTone: "text-emerald-700",
      railTone: "bg-gradient-to-b from-emerald-400 to-emerald-600",
      chipTone: "bg-emerald-50 text-emerald-700",
      bgGradient: "from-emerald-50/40 to-white",
    },
    {
      label: "Today's Check-outs",
      value: String(todayCheckOuts),
      helper: "Departures due today",
      icon: <FiLogOut />,
      iconTone: "bg-gradient-to-br from-sky-500 to-sky-700 text-white",
      valueTone: "text-sky-700",
      railTone: "bg-gradient-to-b from-sky-400 to-sky-600",
      chipTone: "bg-sky-50 text-sky-700",
      bgGradient: "from-sky-50/40 to-white",
    },
    {
      label: "System Health",
      value: String(healthIssues),
      helper: "Rooms needing attention",
      icon: <FiCalendar />,
      iconTone:
        healthIssues > 0
          ? "bg-gradient-to-br from-rose-500 to-rose-700 text-white"
          : "bg-gradient-to-br from-amber-400 to-amber-500 text-[#33365b]",
      valueTone: healthIssues > 0 ? "text-rose-700" : "text-[#33365b]",
      railTone:
        healthIssues > 0
          ? "bg-gradient-to-b from-rose-400 to-rose-600"
          : "bg-gradient-to-b from-amber-300 to-amber-500",
      chipTone:
        healthIssues > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-amber-50 text-amber-800",
      bgGradient: healthIssues > 0 ? "from-rose-50/40 to-white" : "from-amber-50/40 to-white",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <article
          key={stat.label}
          className={`group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br ${stat.bgGradient} p-5 pl-8 shadow-sm transition-all hover:-translate-y-1 hover:border-[#45497a]/30 hover:shadow-lg`}
        >
          <div className={`absolute inset-y-0 left-0 w-3 ${stat.railTone}`} />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
                {stat.label}
              </p>
              <p
                className={`mt-3 text-4xl font-bold tracking-tight ${stat.valueTone}`}
              >
                {isLoading ? "--" : stat.value}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner ${stat.iconTone}`}
            >
              {stat.icon}
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-slate-400">
            {stat.helper}
          </p>
          <div
            className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stat.chipTone}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
            </span>
            Live
          </div>
        </article>
      ))}
    </section>
  );
}
