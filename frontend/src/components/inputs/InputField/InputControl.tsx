import { useFormContext, type RegisterOptions } from "react-hook-form";

type InputControlProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  registerOptions?: RegisterOptions;
};

export function InputControl({
  name,
  className,
  registerOptions,
  ...props
}: InputControlProps) {
  const { register } = useFormContext();

  return (
    <input
      {...register(name, registerOptions)}
      {...props}
      className={`form-input ${className ?? ""}`}
    />
  );
}
