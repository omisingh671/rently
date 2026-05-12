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

  const base = as === "th" ? "px-4 py-3 font-medium" : "px-4 py-3";

  return (
    <Component className={`${base} ${alignment} ${className}`}>
      {children}
    </Component>
  );
}
