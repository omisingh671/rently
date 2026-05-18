import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTableHeader({ children, className = "" }: Props) {
  return (
    <thead
      className={`border-b border-slate-300 bg-slate-200 text-left text-xs font-bold uppercase tracking-wider text-slate-700 ${className}`}
    >
      {children}
    </thead>
  );
}
