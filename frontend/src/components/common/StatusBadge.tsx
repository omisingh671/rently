import clsx from "clsx";

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
  const defaultMap: VariantMap = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-200 text-gray-700",
    MAINTENANCE: "bg-amber-100 text-amber-700",
    ENABLED: "bg-green-100 text-green-700",
    DISABLED: "bg-gray-200 text-gray-700",
  };

  const styles =
    variantMap?.[status] ?? defaultMap[status] ?? "bg-slate-100 text-slate-700";

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
