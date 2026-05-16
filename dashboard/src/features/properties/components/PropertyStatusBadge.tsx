import clsx from "clsx";

export default function PropertyStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "rounded px-2 py-1 text-xs font-medium",
        status === "ACTIVE" && "bg-green-100 text-green-700",
        status === "INACTIVE" && "bg-gray-200 text-gray-700",
        status === "MAINTENANCE" && "bg-amber-100 text-amber-700",
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}
