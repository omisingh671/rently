import clsx from "clsx";

export interface StatItem {
  label: string;
  value: string;
  description?: string;
}

interface StatsGridProps {
  items: StatItem[];
  variant?: "light" | "dark" | "primary";
  className?: string;
}

export default function StatsGrid({
  items,
  variant = "light",
  className,
}: StatsGridProps) {
  const isLight = variant === "light";
  const isDark = variant === "dark";
  const isPrimary = variant === "primary";

  const containerVariant = clsx({
    "border-indigo-200 bg-indigo-50/20": isLight,
    "border-slate-800 bg-slate-900": isDark,
    "border-indigo-600 bg-indigo-500 text-white": isPrimary,
  });

  const dividerVariant = clsx({
    "divide-indigo-200": isLight,
    "divide-slate-800": isDark,
    "divide-indigo-400": isPrimary,
  });

  const labelClass = clsx(
    "text-xs font-semibold uppercase tracking-wide mb-1",
    {
      "text-indigo-500": isLight,
      "text-slate-300": isDark,
      "text-indigo-200": isPrimary,
    }
  );

  const valueClass = clsx("text-lg font-semibold", {
    "text-slate-900": isLight,
    "text-slate-50": isDark,
    "text-white": isPrimary,
  });

  const descriptionClass = clsx("mt-1 text-xs", {
    "text-slate-500": isLight,
    "text-slate-400": isDark,
    "text-indigo-100/90": isPrimary,
  });

  return (
    <div
      className={clsx(
        "rounded-xl shadow-xl border overflow-hidden",
        containerVariant,
        className
      )}
    >
      <div
        className={clsx(
          "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
          "divide-y sm:divide-y-0 md:divide-x",
          dividerVariant
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="p-4 md:p-5">
            <div className={labelClass}>{item.label}</div>
            <div className={valueClass}>{item.value}</div>
            {item.description && (
              <div className={descriptionClass}>{item.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
