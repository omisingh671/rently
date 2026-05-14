import clsx from "clsx";
import { STATUS_BADGE_COLORS } from "@/configs/theme";

type VariantMap = Record<string, string>;

interface Props {
  status: string;
  variantMap?: VariantMap;
  className?: string;
}

/**
 * Generic Status Badge
 * - Accepts optional variantMap override
 */
export default function StatusBadge({ status, variantMap, className }: Props) {
  const styles =
    variantMap?.[status] ?? STATUS_BADGE_COLORS[status] ?? "bg-slate-100 text-slate-700";

  return (
    <span
      className={clsx(
        "rounded px-2 py-1 text-xs font-medium",
        styles,
        className,
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
