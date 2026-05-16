import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { amenitySchema, type AmenityFormValues } from "./amenity.schema";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";
import Button from "@/components/ui/Button";
import { AMENITY_ICONS } from "../../constants/amenityIcons";

type Props = {
  defaultValues?: AmenityFormValues;
  onSubmit: (
    values: AmenityFormValues,
    setServerError: (message: string) => void,
  ) => void;
  isSubmitting?: boolean;
  onCancel: () => void;
};

export default function AmenityForm({
  defaultValues,
  onSubmit,
  isSubmitting,
  onCancel,
}: Props) {
  const methods = useForm<AmenityFormValues>({
    resolver: zodResolver(amenitySchema),
    defaultValues,
  });

  const handleSubmit = (values: AmenityFormValues) => {
    methods.clearErrors("root");
    onSubmit(values, (message) => {
      methods.setError("root", { message });
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-5">
        <ErrorSummary />

        <InputField name="name" label="Amenity Name" required />

        <SelectField name="icon" label="Icon">
          <option value="">Select Icon</option>

          {AMENITY_ICONS.map((icon) => (
            <option key={`${icon.value}-${icon.label}`} value={icon.value}>
              {icon.label}
            </option>
          ))}
        </SelectField>

        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
