import { FiActivity } from "react-icons/fi";
import type { TodayOperationItem } from "../dashboard.helpers";
import { DashboardWidgetCard } from "./DashboardWidgetCard";

type TodayOperationsProps = {
  items: TodayOperationItem[];
  isLoading: boolean;
};

export function TodayOperations({ items, isLoading }: TodayOperationsProps) {
  return (
    <DashboardWidgetCard
      title="Today's Operations"
      subtitle="Daily movement and pending workflow"
      headerIcon={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#33365b]/10 text-[#33365b]">
          <FiActivity />
        </div>
      }
    >
      <div className="divide-y divide-slate-100">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 px-5 py-3"
          >
            <span className="text-sm font-medium text-slate-600">
              {item.label}
            </span>
            <span className="text-base font-bold text-slate-950">
              {isLoading ? "--" : item.value}
            </span>
          </div>
        ))}
      </div>
    </DashboardWidgetCard>
  );
}
