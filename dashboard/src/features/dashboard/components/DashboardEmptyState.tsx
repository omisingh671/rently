import type { ReactNode } from "react";
import { FiInbox } from "react-icons/fi";

type DashboardEmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function DashboardEmptyState({
  title,
  message,
  action,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
      <div className="rounded-full bg-slate-50 p-4 text-slate-400">
        <FiInbox className="h-7 w-7" />
      </div>
      <h4 className="mt-4 text-base font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
