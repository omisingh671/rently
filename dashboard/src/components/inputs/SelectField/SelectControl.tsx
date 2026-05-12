import { useFormContext } from "react-hook-form";
import { HiChevronDown } from "react-icons/hi2";

type SelectControlProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
};

export function SelectControl({
  name,
  className,
  children,
  ...props
}: SelectControlProps) {
  const { register } = useFormContext();

  return (
    <div className="relative">
      <select
        {...register(name)}
        {...props}
        className={`form-select ${className ?? ""} appearance-none`}
      >
        {children}
      </select>

      <HiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4" />
    </div>
  );
}
