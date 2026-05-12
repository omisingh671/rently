import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTableHeader({ children, className = "" }: Props) {
  return (
    <thead className={`bg-slate-700 text-slate-50 ${className}`}>
      {children}
    </thead>
  );
}
