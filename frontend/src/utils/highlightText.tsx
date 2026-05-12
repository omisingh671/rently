import type { ReactNode } from "react";

export function highlightText(text: string, query: string): ReactNode {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const regex = new RegExp(`(${escaped})`, "ig");

  const parts = text.split(regex);

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="rounded bg-yellow-200 px-0.5 text-slate-900">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
