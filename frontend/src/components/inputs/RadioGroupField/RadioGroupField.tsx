import { Field } from "../Field";
import { RadioGroupControl, type RadioOption } from "./RadioGroupControl";

type RadioGroupFieldProps = {
  name: string;
  label?: string;
  options: RadioOption[];
  layout?: "vertical" | "horizontal";
};

export function RadioGroupField({
  name,
  label,
  options,
  layout,
}: RadioGroupFieldProps) {
  return (
    <Field name={name} label={label}>
      <RadioGroupControl name={name} options={options} layout={layout} />
    </Field>
  );
}
