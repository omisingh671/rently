import { useFormContext } from "react-hook-form";

type CompositeFieldProps = {
  name: string;
  label?: string;
  children: React.ReactNode;
};

export function CompositeField({ name, label, children }: CompositeFieldProps) {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      {children}

      {error && <p className="form-error">{String(error.message)}</p>}
    </div>
  );
}
