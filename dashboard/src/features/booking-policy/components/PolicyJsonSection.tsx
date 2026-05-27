import type { ChangeEvent } from "react";

interface PolicyJsonSectionProps {
  title: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}

export default function PolicyJsonSection({
  title,
  value,
  readOnly,
  onChange,
}: PolicyJsonSectionProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      <textarea
        value={value}
        readOnly={readOnly}
        onChange={handleChange}
        rows={8}
        className="mt-3 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 read-only:cursor-default read-only:bg-slate-100"
      />
    </section>
  );
}
