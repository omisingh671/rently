import clsx from "clsx";
import type { IconType } from "react-icons";
import type { ReactNode } from "react";

interface ChipFeaturedProps {
  id?: string | number;
  icon: ReactNode | IconType;
  title: string;
  desc?: string;
  isDark?: boolean;
  cardBg?: string;
  borderClass?: string;
  iconBg?: string;
  size?: "sm" | "md" | "lg";
}

export default function ChipFeatured({
  id,
  icon,
  title,
  desc = "",
  isDark = false,
  cardBg = "",
  borderClass = "",
  iconBg = "",
  size = "md",
}: ChipFeaturedProps) {
  const sizeMap = {
    sm: {
      wrapper: "p-3 gap-3",
      iconBox: "w-8 h-8 text-base",
      iconSize: 16,
      title: "text-sm",
      desc: "text-xs",
    },
    md: {
      wrapper: "p-5 gap-4",
      iconBox: "w-12 h-12 text-xl",
      iconSize: 22,
      title: "text-base",
      desc: "text-sm",
    },
    lg: {
      wrapper: "p-6 gap-5",
      iconBox: "w-14 h-14 text-2xl",
      iconSize: 28,
      title: "text-lg",
      desc: "text-base",
    },
  } as const;

  const variant = sizeMap[size];

  const renderIcon = () => {
    if (typeof icon === "function") {
      const IconComponent = icon as IconType;
      return <IconComponent size={variant.iconSize} />;
    }
    return icon;
  };

  return (
    <div
      key={id}
      className={clsx(
        "flex items-start rounded-xl transition border",
        variant.wrapper,
        cardBg,
        borderClass,
        isDark ? "hover:bg-white/10" : "hover:border-indigo-300"
      )}
      role="group"
    >
      <div
        className={clsx(
          "shrink-0 rounded-lg grid place-items-center",
          variant.iconBox,
          iconBg
        )}
      >
        {renderIcon()}
      </div>

      <div>
        <h3
          className={clsx(
            "font-semibold",
            variant.title,
            isDark ? "text-white" : "text-slate-900"
          )}
        >
          {title}
        </h3>

        <p
          className={clsx(
            "mt-1",
            variant.desc,
            isDark ? "text-indigo-100/80" : "text-slate-500"
          )}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}
