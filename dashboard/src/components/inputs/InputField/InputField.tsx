import { Field } from "../Field";
import { InputControl } from "./InputControl";
import { type RegisterOptions } from "react-hook-form";

type InputFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label?: string;
  registerOptions?: RegisterOptions;
};

export function InputField({
  name,
  label,
  registerOptions,
  ...props
}: InputFieldProps) {
  return (
    <Field name={name} label={label}>
      <InputControl name={name} registerOptions={registerOptions} {...props} />
    </Field>
  );
}
