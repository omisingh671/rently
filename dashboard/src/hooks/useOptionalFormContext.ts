import {
  useFormContext,
  type UseFormReturn,
  type FieldValues,
} from "react-hook-form";

export default function useOptionalFormContext<
  TFormValues extends FieldValues = FieldValues
>(): UseFormReturn<TFormValues> | undefined {
  try {
    return useFormContext<TFormValues>();
  } catch {
    return undefined;
  }
}
