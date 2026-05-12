import { FiCheck } from "react-icons/fi";
import clsx from "clsx";

type IconSize = "sm" | "md" | "lg" | "xl";
type IconLayout = "square" | "circle";
type IconBadgeVariant = "flat" | "ring";

interface IconBadgeProps {
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  size?: IconSize;
  layout?: IconLayout;
  variant?: IconBadgeVariant;
  color?: string;
  bg?: string;
}

const sizeMap: Record<IconSize, string> = {
  sm: "w-8 aspect-square",
  md: "w-10 aspect-square",
  lg: "w-12 aspect-square",
  xl: "w-14 aspect-square",
};

const iconSizeMap: Record<IconSize, string> = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-7 h-7",
};

export default function IconBadge({
  icon: Icon,
  size = "md",
  layout = "circle",
  variant = "ring",
  color = "text-slate-700",
  bg = "bg-slate-100 ring-slate-200",
}: IconBadgeProps) {
  const ResolvedIcon = Icon || FiCheck;

  return (
    <div
      className={clsx(
        "flex-none inline-flex items-center justify-center transition-colors",
        sizeMap[size],
        layout === "circle" ? "rounded-full" : "rounded-xl",

        // Variant handling
        variant === "ring" && "ring-1 ring-offset-2 ring-offset-white",

        bg
      )}
    >
      <ResolvedIcon className={clsx(iconSizeMap[size], color)} />
    </div>
  );
}
