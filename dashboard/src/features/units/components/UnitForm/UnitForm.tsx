import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { CheckboxField } from "@/components/inputs/CheckboxField/CheckboxField";
import { ErrorSummary } from "@/components/inputs";

import AmenitiesGrid from "@/features/amenities/AmenitiesGrid";

import { unitSchema, type UnitFormValues } from "./unit.schema";

import type { AdminProperty } from "@/features/properties/types";

type Props = {
  properties: AdminProperty[];
  defaultValues?: Partial<UnitFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onCancel?: () => void;

  onSubmit: (
    values: UnitFormValues,
    setServerError: (message: string) => void,
  ) => void;
};

export default function UnitForm({
  properties,
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: Props) {
  const methods = useForm<UnitFormValues>({
    resolver: zodResolver(unitSchema),
    defaultValues,
  });

  const { handleSubmit, setError, clearErrors, reset } = methods;

  /* Reset form when editing unit */
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  const submitHandler = (values: UnitFormValues) => {
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

        <div className="bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-10">
            {/* LEFT SIDE FORM FIELDS */}

            <div className="space-y-6">
              <SelectField name="propertyId" label="Property">
                <option value="">Select property</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </SelectField>

              <InputField name="unitNumber" label="Unit Number" />

              <InputField
                name="floor"
                label="Floor"
                type="number"
                registerOptions={{ valueAsNumber: true }}
              />

              <SelectField name="status" label="Status">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </SelectField>

              <CheckboxField name="isActive" label="Enabled" />
            </div>

            {/* CENTER DIVIDER */}

            <div className="hidden lg:block w-px bg-slate-200" />

            {/* RIGHT SIDE AMENITIES */}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 tracking-wide">
                Amenities
              </h3>

              <div className="w-full">
                <AmenitiesGrid iconSize={18} />
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}

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
