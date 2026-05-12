import { HiChevronDown } from "react-icons/hi2";

type Props = {
  value: number;
  onChange: (next: number) => void;
  options?: readonly number[];
  id?: string;
};

const DEFAULT_OPTIONS = [10, 15, 20, 25, 50, 100] as const;

export default function PageSizeSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  id = "page-size-selector",
}: Props) {
  return (
    <div className="relative w-20 py-1 bg-white rounded-md border border-slate-300 flex items-center focus-within:ring-2 focus-within:ring-slate-300">
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) onChange(next);
        }}
        className="appearance-none h-8 w-full bg-transparent text-sm outline-none cursor-pointer px-2"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <HiChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-slate-400" />
    </div>
  );
}
