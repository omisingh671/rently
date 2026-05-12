import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { ErrorSummary } from "@/components/inputs";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { TextareaField } from "@/components/inputs/TextareaField/TextareaField";
import { useAdminRooms } from "@/features/admin/rooms/hooks/useAdminRooms";
import { useAdminUnits } from "@/features/admin/units/hooks/useAdminUnits";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/admin/config/queryLimits";
import type { AdminProperty } from "@/features/admin/properties/types";
import {
  maintenanceSchema,
  type MaintenanceFormValues,
} from "./maintenance.schema";

type Props = {
  properties: AdminProperty[];
  defaultValues?: Partial<MaintenanceFormValues>;
  submitLabel: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (
    values: MaintenanceFormValues,
    setServerError: (message: string) => void,
  ) => void;
};

export default function MaintenanceForm({
  properties,
  defaultValues,
  submitLabel,
  isEditing = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: Props) {
  const methods = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues,
  });

  const { clearErrors, handleSubmit, reset, setError, setValue } = methods;
  const propertyId = useWatch({
    control: methods.control,
    name: "propertyId",
  });
  const targetType = useWatch({
    control: methods.control,
    name: "targetType",
  });

  const { data: unitsData } = useAdminUnits(propertyId, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const units = unitsData?.items ?? [];

  const { data: roomsData } = useAdminRooms(propertyId, 1, ADMIN_OPTION_LIST_LIMIT, {
    search: "",
    status: "",
    isActive: "true",
  });
  const rooms = roomsData?.items ?? [];

  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    if (targetType === "PROPERTY") {
      setValue("unitId", "");
      setValue("roomId", "");
    }

    if (targetType === "UNIT") {
      setValue("roomId", "");
    }
  }, [setValue, targetType]);

  const submitHandler = (values: MaintenanceFormValues) => {
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SelectField name="propertyId" label="Property" disabled={isEditing}>
            <option value="">Select property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </SelectField>

          <SelectField name="targetType" label="Target">
            <option value="PROPERTY">Property</option>
            <option value="UNIT">Unit</option>
            <option value="ROOM">Room</option>
          </SelectField>

          {targetType === "UNIT" && (
            <SelectField name="unitId" label="Unit">
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.unitNumber}
                </option>
              ))}
            </SelectField>
          )}

          {targetType === "ROOM" && (
            <SelectField name="roomId" label="Room">
              <option value="">Select room</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.unitNumber} / {room.number} - {room.name}
                </option>
              ))}
            </SelectField>
          )}

          <InputField name="startDate" label="Start Date" type="date" />
          <InputField name="endDate" label="End Date" type="date" />
        </div>

        <TextareaField name="reason" label="Reason" rows={4} />

        <div className="flex flex-col gap-3 border-t border-slate-200 py-4 sm:flex-row">
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
