import clsx from "clsx";
import type { ReactNode } from "react";
import type { IconType } from "react-icons";

export type ChipVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "dark";

export type ChipSize = "sm" | "md" | "lg" | "xl";

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: ReactNode | IconType;
  iconRight?: ReactNode | IconType;
  className?: string;
  onDark?: boolean;
}

const sizeMap: Record<ChipSize, string> = {
  sm: "px-3 py-1 text-[10px]",
  md: "px-4 py-1.5 text-xs",
  lg: "px-5 py-2 text-sm",
  xl: "px-6 py-2.5 text-base",
};

const iconSizeMap: Record<ChipSize, number> = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 26,
};

const filledMap: Record<ChipVariant, string> = {
  primary: "bg-indigo-500/15 text-indigo-700 border border-indigo-200",
  secondary: "bg-slate-100 text-slate-700 border border-slate-200",
  success: "bg-green-500/15 text-green-700 border border-green-200",
  warning: "bg-amber-500/15 text-amber-700 border border-amber-200",
  danger: "bg-red-500/15 text-red-700 border border-red-200",
  info: "bg-sky-500/15 text-sky-700 border border-sky-200",
  dark: "bg-slate-900 text-white border border-slate-700",
};

const onDarkMap: Record<ChipVariant, string> = {
  primary:
    "bg-indigo-500/20 text-indigo-100 border border-indigo-400/30 hover:bg-indigo-500/30",
  secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
  success:
    "bg-green-500/20 text-green-100 border border-green-400/30 hover:bg-green-500/30",
  warning:
    "bg-amber-500/20 text-amber-100 border border-amber-400/30 hover:bg-amber-500/30",
  danger:
    "bg-red-500/20 text-red-100 border border-red-400/30 hover:bg-red-500/30",
  info: "bg-sky-500/20 text-sky-100 border border-sky-400/30 hover:bg-sky-500/30",
  dark: "bg-slate-500/20 text-slate-100 border border-slate-400/30 hover:bg-slate-500/30",
};

const renderIcon = (icon: ReactNode | IconType | undefined, size: ChipSize) => {
  if (!icon) return null;

  if (typeof icon === "function") {
    const IconComponent = icon as IconType;
    return <IconComponent size={iconSizeMap[size]} />;
  }

  return icon;
};

export default function Chip({
  children,
  variant = "primary",
  size = "sm",
  icon,
  iconRight,
  className,
  onDark = false,
}: ChipProps) {
  const variantClasses = onDark
    ? clsx(onDarkMap[variant], "backdrop-blur-sm transition-all")
    : filledMap[variant];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-4 rounded-full font-medium whitespace-nowrap",
        variantClasses,
        sizeMap[size],
        className
      )}
    >
      {icon && (
        <span className="shrink-0 flex items-center">
          {renderIcon(icon, size)}
        </span>
      )}

      {children}

      {iconRight && (
        <span className="shrink-0 flex items-center">
          {renderIcon(iconRight, size)}
        </span>
      )}
    </span>
  );
}
