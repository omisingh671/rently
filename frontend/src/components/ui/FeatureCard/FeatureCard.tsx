import clsx from "clsx";
import type { IconType } from "react-icons";
import type { ReactNode } from "react";

type IconPosition = "left" | "top";
type ContentAlign = "left" | "center";

interface FeatureCardProps {
  icon: IconType | ReactNode;
  title: string;
  description: string;

  iconPosition?: IconPosition;
  contentAlign?: ContentAlign;

  iconBg?: string;
  iconColor?: string;
  cardBg?: string;
  borderClass?: string;
  compact?: boolean;
}

export default function FeatureCard({
  icon,
  title,
  description,

  iconPosition = "left",
  contentAlign = "left",

  iconBg = "bg-indigo-100/80",
  iconColor = "text-indigo-600",
  cardBg = "bg-indigo-50/40",
  borderClass = "border border-indigo-200/60",
  compact = false,
}: FeatureCardProps) {
  const isIconType = typeof icon === "function";
  const isTop = iconPosition === "top";
  const isCentered = isTop && contentAlign === "center";

  return (
    <div
      className={clsx(
        "rounded-2xl transition hover:shadow-md",
        cardBg,
        borderClass,
        compact ? "p-4" : "p-6"
      )}
    >
      <div
        className={clsx(
          isTop ? "flex flex-col gap-4" : "flex items-start gap-4",
          isCentered && "items-center text-center"
        )}
      >
        {/* Icon */}
        <div
          className={clsx(
            "flex items-center justify-center rounded-xl shrink-0",
            iconBg,
            iconColor,
            compact ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"
          )}
        >
          {isIconType ? icon({}) : icon}
        </div>

        {/* Content */}
        <div className={clsx(isCentered && "text-center")}>
          <h4 className="text-base font-semibold text-slate-800">{title}</h4>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
