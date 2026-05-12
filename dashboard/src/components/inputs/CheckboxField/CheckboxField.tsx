import { Field } from "../Field";
import { CheckboxControl } from "./CheckboxControl";

type CheckboxFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label?: React.ReactNode;
};

export function CheckboxField({ name, label, ...props }: CheckboxFieldProps) {
  return (
    <Field name={name}>
      <CheckboxControl name={name} {...props}>
        {label}
      </CheckboxControl>
    </Field>
  );
}
