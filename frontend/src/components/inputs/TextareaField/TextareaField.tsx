import { Field } from "../Field";
import { TextareaControl } from "./TextareaControl";

type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  label?: string;
};

export function TextareaField({ name, label, ...props }: TextareaFieldProps) {
  return (
    <Field name={name} label={label}>
      <TextareaControl name={name} {...props} />
    </Field>
  );
}
