import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { ErrorSummary } from "@/components/inputs";
import {
  propertyFormSchema,
  type PropertyFormValues,
} from "./propertyForm.schema";

type Props = {
  defaultValues?: Partial<PropertyFormValues>;
  tenantOptions: Array<{
    id: string;
    name: string;
  }>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;

  onSubmit: (
    values: PropertyFormValues,
    setServerError: (message: string) => void,
  ) => void;
};

export default function PropertyForm({
  defaultValues,
  tenantOptions,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const methods = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues,
  });

  const { handleSubmit, setError, clearErrors, reset } = methods;

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const submitHandler = (values: PropertyFormValues) => {
    clearErrors("root.server");

    onSubmit(values, (message) => {
      setError("root.server", {
        type: "server",
        message,
      });
    });
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(submitHandler)}
        className="space-y-8"
        noValidate
      >
        <ErrorSummary />

        <div className="bg-white space-y-6">
          <SelectField name="tenantId" label="Tenant">
            <option value="">Select tenant</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </SelectField>

          <InputField name="name" label="Property Name" />
          <InputField name="address" label="Address" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField name="city" label="City" />
            <InputField name="state" label="State" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectField name="status" label="Status">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="MAINTENANCE">Maintenance</option>
            </SelectField>

            {defaultValues?.isActive !== undefined && (
              <SelectField name="isActive" label="Enabled">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </SelectField>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-200 py-4">
            {onCancel && (
              <Button type="button" variant="dark" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
