import { useFormContext } from "react-hook-form";

type CheckboxControlProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  children?: React.ReactNode;
};

export function CheckboxControl({
  name,
  children,
  className,
  ...props
}: CheckboxControlProps) {
  const { register } = useFormContext();

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        {...register(name)}
        {...props}
        className={className}
      />
      {children && <span>{children}</span>}
    </label>
  );
}
