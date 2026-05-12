import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

type FormMetaFieldsProps = Record<string, string | number | undefined>;

export default function FormMetaFields(props: FormMetaFieldsProps) {
  const { register, setValue } = useFormContext();

  useEffect(() => {
    Object.entries(props).forEach(([key, value]) => {
      if (value !== undefined) {
        setValue(key, value, { shouldDirty: false });
      }
    });
  }, [props, setValue]);

  return (
    <>
      {Object.entries(props).map(([key, value]) =>
        value === undefined ? null : (
          <input
            key={key}
            type="hidden"
            {...register(key)}
            value={String(value)}
          />
        )
      )}
    </>
  );
}
