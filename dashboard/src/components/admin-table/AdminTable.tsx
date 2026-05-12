import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

export default function AdminTable({ children, className = "" }: Props) {
  return (
    <table className={`min-w-full text-sm ${className}`}>{children}</table>
  );
}
