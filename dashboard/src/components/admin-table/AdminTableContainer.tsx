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
      className={`relative overflow-x-auto rounded-lg border border-slate-200 bg-white ${className}`}
    >
      {children}
    </div>
  );
}
