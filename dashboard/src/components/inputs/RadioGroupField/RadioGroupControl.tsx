import { useFormContext } from "react-hook-form";

export type RadioOption = {
  label: React.ReactNode;
  value: string | number;
  disabled?: boolean;
};

type RadioGroupControlProps = {
  name: string;
  options: RadioOption[];
  layout?: "vertical" | "horizontal";
};

export function RadioGroupControl({
  name,
  options,
  layout = "vertical",
}: RadioGroupControlProps) {
  const { register } = useFormContext();

  return (
    <div
      className={
        layout === "horizontal" ? "flex flex-wrap gap-4" : "flex flex-col gap-2"
      }
    >
      {options.map((opt) => (
        <label
          key={String(opt.value)}
          className="inline-flex items-center gap-2 cursor-pointer"
        >
          <input
            type="radio"
            value={opt.value}
            disabled={opt.disabled}
            {...register(name)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}
