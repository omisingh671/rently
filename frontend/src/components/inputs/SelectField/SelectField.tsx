import { Field } from "../Field";
import { SelectControl } from "./SelectControl";

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label?: string;
  children: React.ReactNode;
};

export function SelectField({
  name,
  label,
  children,
  ...props
}: SelectFieldProps) {
  return (
    <Field name={name} label={label}>
      <SelectControl name={name} {...props}>
        {children}
      </SelectControl>
    </Field>
  );
}
