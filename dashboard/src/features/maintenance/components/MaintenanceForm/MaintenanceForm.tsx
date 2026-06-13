import { useEffect, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@/components/ui/Button";
import { ErrorSummary } from "@/components/inputs";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { TextareaField } from "@/components/inputs/TextareaField/TextareaField";
import { useAdminRooms } from "@/features/rooms/hooks/useAdminRooms";
import { useAdminUnits } from "@/features/units/hooks/useAdminUnits";
import { ADMIN_OPTION_LIST_LIMIT } from "@/features/config/queryLimits";
import type { AdminProperty } from "@/features/properties/types";
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

  const { clearErrors, handleSubmit, register, reset, setError, setValue } = methods;
  const propertyId = useWatch({
    control: methods.control,
    name: "propertyId",
  });
  const targetType = useWatch({
    control: methods.control,
    name: "targetType",
  });
  const status = useWatch({ control: methods.control, name: "status" });
  const emergencyOverride = useWatch({
    control: methods.control,
    name: "emergencyOverride",
  });
  const previousPropertyIdRef = useRef<string | undefined>(propertyId);

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
      previousPropertyIdRef.current = defaultValues.propertyId;
    }
  }, [defaultValues, reset]);

  useEffect(() => {
    if (targetType === "PROPERTY") {
      setValue("unitId", "");
      setValue("roomId", "");
      clearErrors(["unitId", "roomId"]);
    }

    if (targetType === "UNIT") {
      setValue("roomId", "");
      clearErrors("roomId");
    }
  }, [clearErrors, setValue, targetType]);

  useEffect(() => {
    if (previousPropertyIdRef.current !== propertyId) {
      setValue("unitId", "");
      setValue("roomId", "");
      clearErrors(["unitId", "roomId"]);
      previousPropertyIdRef.current = propertyId;
    }
  }, [clearErrors, propertyId, setValue]);

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

        <div className={`grid grid-cols-1 gap-6 ${targetType === "PROPERTY" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
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
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left Column: Start Date and End Date stacked */}
          <div className="flex flex-col gap-4 [&_.form-group]:mb-0">
            <InputField name="startDate" label="Start Date" type="date" />
            <InputField name="endDate" label="End Date" type="date" />
          </div>

          {/* Right Column: Reason with matching height */}
          <div className="flex flex-col [&_.form-group]:mb-0 [&_.form-group]:h-full [&_.form-group]:flex [&_.form-group]:flex-col [&_.form-control]:flex-1 [&_.form-control]:flex [&_textarea]:flex-1 [&_textarea]:resize-none">
            <TextareaField name="reason" label="Reason" rows={4} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SelectField name="priority" label="Priority">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="EMERGENCY">Emergency</option>
          </SelectField>
          {isEditing && (
            <SelectField name="status" label="Workflow status">
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CANCELLED">Cancelled</option>
            </SelectField>
          )}
          {isEditing && status === "RESOLVED" && (
            <TextareaField
              name="resolutionNote"
              label="Resolution note"
              rows={3}
            />
          )}
          <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <input
              type="checkbox"
              {...register("emergencyOverride")}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold text-amber-900">
                Emergency conflict override
              </span>
              <span className="text-amber-700">
                Admin-only. Use when maintenance must proceed despite an active reservation.
              </span>
            </span>
          </label>
          {emergencyOverride && (
            <TextareaField
              name="emergencyReason"
              label="Emergency audit reason"
              rows={3}
            />
          )}
        </div>

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
