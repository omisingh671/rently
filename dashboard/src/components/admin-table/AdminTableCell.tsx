import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  as?: "td" | "th";
  align?: "left" | "right" | "center";
  className?: string;
};

export default function AdminTableCell({
  children,
  as = "td",
  align = "left",
  className = "",
}: Props) {
  const Component = as;

  const alignment =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  const base =
    as === "th"
      ? "whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider"
      : "px-6 py-4 text-slate-600";

  return (
    <Component className={`${base} ${alignment} ${className}`}>
      {children}
    </Component>
  );
}
