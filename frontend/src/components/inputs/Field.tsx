import { useFormContext } from "react-hook-form";

export type FieldProps = {
  name: string;
  label?: string;
  children: React.ReactNode;
};

export function Field({ name, label, children }: FieldProps) {
  const {
    formState: { errors },
  } = useFormContext();

  const error = errors[name];

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}

      <div className={`form-control ${error ? "error" : ""}`}>{children}</div>

      {error && <p className="form-error">{String(error.message)}</p>}
    </div>
  );
}
