import { useFormContext } from "react-hook-form";

type TextareaControlProps =
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    name: string;
  };

export function TextareaControl({
  name,
  className,
  ...props
}: TextareaControlProps) {
  const { register } = useFormContext();

  return (
    <textarea
      {...register(name)}
      {...props}
      className={`form-textarea ${className ?? ""}`}
    />
  );
}
