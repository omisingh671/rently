import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { CheckboxField } from "@/components/inputs/CheckboxField/CheckboxField";
import { ErrorSummary } from "@/components/inputs";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import AmenitiesGrid from "@/features/amenities/AmenitiesGrid";
import { useAdminUnits } from "@/features/units/hooks/useAdminUnits";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import type { AdminProperty } from "@/features/properties/types";
import { roomSchema, type RoomFormValues } from "./room.schema";

type Props = {
  properties: AdminProperty[];
  defaultValues?: Partial<RoomFormValues>;
  submitLabel: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (
    values: RoomFormValues,
    setServerError: (message: string) => void,
  ) => void;
};

export default function RoomForm({
  properties,
  defaultValues,
  submitLabel,
  isEditing = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: Props) {
  const methods = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues,
  });

  const { clearErrors, handleSubmit, setError, reset, setValue } = methods;
  const propertyId = useWatch({
    control: methods.control,
    name: "propertyId",
  });

  const { data: unitsData } = useAdminUnits(propertyId, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const units = unitsData?.items ?? [];

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!propertyId) {
      setValue("unitId", "");
    }
  }, [propertyId, setValue]);

  const submitHandler = (values: RoomFormValues) => {
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
        className="space-y-6"
        noValidate
      >
        <ErrorSummary />

        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-5">
            <SelectField name="propertyId" label="Property" disabled={isEditing}>
              <option value="">Select property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>

            <SelectField name="unitId" label="Unit">
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitNumber}
                </option>
              ))}
            </SelectField>

            <InputField name="name" label="Room Name" />
            <InputField name="number" label="Room Number" />
            <InputField
              name="maxOccupancy"
              label="Max Occupancy"
              type="number"
              registerOptions={{ valueAsNumber: true }}
            />

            <SelectField name="status" label="Status">
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
            </SelectField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CheckboxField name="hasAC" label="Air conditioned" />
              <CheckboxField name="isActive" label="Enabled" />
            </div>
          </div>

          <div className="hidden w-px bg-slate-200 lg:block" />

          <div className="min-w-0 space-y-4 overflow-x-hidden lg:max-h-[52vh] lg:overflow-y-auto lg:pl-1 lg:pr-2">
            <h3 className="text-sm font-semibold tracking-wide text-slate-700">
              Amenities
            </h3>
            <AmenitiesGrid iconSize={18} />
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white py-4 sm:flex-row">
          {onCancel && (
            <Button type="button" variant="dark" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
