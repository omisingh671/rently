import { ICON_REGISTRY } from "@/configs/iconRegistry";
const { FiAlertTriangle, FiCheckCircle } = ICON_REGISTRY;
import type { AttentionItem } from "../dashboard.helpers";
import { DashboardWidgetCard } from "./DashboardWidgetCard";

type NeedsAttentionProps = {
  items: AttentionItem[];
  isLoading: boolean;
};

const pluralize = (value: number, label: string) => {
  if (value === 1) return `${value} ${label}`;

  if (label.startsWith("room is ")) {
    return `${value} rooms are ${label.replace("room is ", "")}`;
  }

  if (label.startsWith("disabled unit ")) {
    return `${value} disabled units ${label.replace("disabled unit ", "")}`;
  }

  return `${value} ${label}`;
};

export function NeedsAttention({ items, isLoading }: NeedsAttentionProps) {
  return (
    <DashboardWidgetCard
      title="Needs Attention"
      subtitle="Only active problems are shown"
      headerIcon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
          <FiAlertTriangle />
        </div>
      }
    >
      {isLoading ? (
        <div className="px-5 py-6 text-sm font-medium text-slate-500">
          Checking operational signals...
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-3 px-5 py-6 text-sm font-semibold text-emerald-700">
          <FiCheckCircle className="h-5 w-5" />
          No active issues found.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-3 px-5 py-3 text-sm font-medium text-slate-700"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <span>{pluralize(item.value, item.label)}</span>
            </div>
          ))}
        </div>
      )}
    </DashboardWidgetCard>
  );
}
