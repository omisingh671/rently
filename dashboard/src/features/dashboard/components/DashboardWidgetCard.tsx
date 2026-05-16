import type { ReactNode } from "react";

type DashboardWidgetCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  headerIcon?: ReactNode;
  children: ReactNode;
};

export function DashboardWidgetCard({
  title,
  subtitle,
  action,
  headerIcon,
  children,
}: DashboardWidgetCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-[#e9edf5] px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs font-medium text-slate-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action ?? headerIcon ?? null}
      </div>
      {children}
    </section>
  );
}
