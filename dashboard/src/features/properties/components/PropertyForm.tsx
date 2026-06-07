import { useEffect, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
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
  isCreateMode?: boolean;
  onCancel?: () => void;

  onSubmit: (
    values: PropertyFormValues,
    setServerError: (
      message: string,
      field?: keyof PropertyFormValues,
    ) => void,
  ) => void;
};

export default function PropertyForm({
  defaultValues,
  tenantOptions,
  submitLabel,
  onSubmit,
  onCancel,
  isCreateMode = false,
  isSubmitting = false,
}: Props) {
  const methods = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      slug: "",
      status: "ACTIVE",
      supportEmail: "",
      supportPhone: "",
      latitude: "",
      longitude: "",
      ...defaultValues,
    },
  });

  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    setValue,
    formState,
  } = methods;
  const name = useWatch({ control, name: "name" });
  const city = useWatch({ control, name: "city" });
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const toSlug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80)
      .replace(/-+$/g, "");

  useEffect(() => {
    if (defaultValues) {
      reset({
        slug: "",
        status: "ACTIVE",
        supportEmail: "",
        supportPhone: "",
        latitude: "",
        longitude: "",
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!isCreateMode || defaultValues?.slug || formState.dirtyFields.slug) {
      return;
    }

    const nextSlug = toSlug(`${name ?? ""}-${city ?? ""}`);
    if (nextSlug) {
      setValue("slug", nextSlug, { shouldDirty: false, shouldValidate: true });
    }
  }, [
    city,
    defaultValues?.slug,
    formState.dirtyFields.slug,
    isCreateMode,
    name,
    setValue,
  ]);

  const submitHandler = (values: PropertyFormValues) => {
    setServerMessage(null);
    clearErrors("root.server");

    onSubmit(values, (message, field) => {
      setServerMessage(message);

      if (field) {
        setError(field, {
          type: "server",
          message,
        });
        return;
      }

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
        {serverMessage && (
          <div
            className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
            role="alert"
            aria-live="assertive"
          >
            {serverMessage}
          </div>
        )}

        <div className="bg-white space-y-6">
          <SelectField name="tenantId" label="Tenant">
            <option value="">Select tenant</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </SelectField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputField name="name" label="Property Name" />
            <InputField
              name="slug"
              label="Property Slug"
              readOnly={isCreateMode}
              className={
                isCreateMode ? "bg-slate-50 text-slate-600" : undefined
              }
            />
          </div>
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

          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Property contact
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InputField name="supportEmail" label="Support Email" />
              <InputField name="supportPhone" label="Support Phone" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InputField name="latitude" label="Latitude" />
              <InputField name="longitude" label="Longitude" />
            </div>
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
