import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTableRow({ children, className = "" }: Props) {
  return (
    <tr
      className={`border-t border-gray-200 hover:bg-slate-50 transition-colors ${className}`}
    >
      {children}
    </tr>
  );
}
