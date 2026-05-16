import type { AvailabilityOption } from "@/features/availability/domain";

interface OptionPricePanelProps {
  option: AvailabilityOption;
  formatPrice: (price: number) => string;
  totalClassName?: string;
}

const buildBreakdownText = (
  priceBreakup: number[],
  formatPrice: (price: number) => string,
) => {
  if (priceBreakup.length <= 1) {
    return null;
  }

  const groupedPrices = priceBreakup.reduce<Array<{ price: number; count: number }>>(
    (groups, price) => {
      const existingGroup = groups.find((group) => group.price === price);

      if (existingGroup) {
        existingGroup.count += 1;
        return groups;
      }

      groups.push({ price, count: 1 });
      return groups;
    },
    [],
  );

  return groupedPrices
    .map((group) =>
      group.count > 1
        ? `${group.count} x ${formatPrice(group.price)}`
        : formatPrice(group.price),
    )
    .join(" + ");
};

export const OptionPricePanel = ({
  option,
  formatPrice,
  totalClassName = "text-[rgb(var(--primary)/1)]",
}: OptionPricePanelProps) => {
  const breakdownText = buildBreakdownText(option.priceBreakup ?? [], formatPrice);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Nightly Rate
          </div>
          <div className="mt-0.5 text-base font-bold text-slate-900">
            {formatPrice(option.nightlyTotal)}
          </div>
          {breakdownText && (
            <div className="mt-1 max-w-[13rem] truncate text-xs font-medium text-slate-500">
              {breakdownText}
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Total Stay
          </div>
          <div className={`mt-0.5 text-lg font-bold ${totalClassName}`}>
            {formatPrice(option.stayTotal)}
          </div>
        </div>
      </div>
    </div>
  );
};
