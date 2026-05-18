import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTableContainer({
  children,
  className = "",
}: Props) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
