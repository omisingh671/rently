import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTableRow({ children, className = "" }: Props) {
  return (
    <tr
      className={`border-t border-slate-200 transition-colors hover:bg-slate-50/80 ${className}`}
    >
      {children}
    </tr>
  );
}
