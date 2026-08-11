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

const PRIORITY_OPTIONS: Array<{
  value: MaintenanceFormValues["priority"];
  label: string;
  description: string;
}> = [
  { value: "LOW", label: "Low", description: "Routine work" },
  { value: "MEDIUM", label: "Medium", description: "Schedule promptly" },
  { value: "HIGH", label: "High", description: "Urgent attention" },
  {
    value: "EMERGENCY",
    label: "Emergency",
    description: "Immediate safety or service risk",
  },
];

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

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
  const priority = useWatch({ control: methods.control, name: "priority" });
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

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-semibold">
            {isEditing ? "Update an operational maintenance block" : "Create an operational maintenance block"}
          </p>
          <p className="mt-1 text-blue-700">
            Use this for repairs, safety faults, inspections, or equipment downtime. For holidays or owner-requested sell stops, use Property Closures instead.
          </p>
        </div>

        <FormSection
          title="1. Affected inventory"
          description="Choose the smallest scope that is actually unavailable. A property block removes every room from sale."
        >
          <div className={`grid grid-cols-1 gap-5 ${targetType === "PROPERTY" ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
            <SelectField name="propertyId" label="Property" disabled={isEditing}>
              <option value="">Select Property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </SelectField>

            <SelectField name="targetType" label="Block level">
              <option value="PROPERTY">Entire Property</option>
              <option value="UNIT">One Unit</option>
              <option value="ROOM">One Room</option>
            </SelectField>

            {targetType === "UNIT" && (
              <SelectField name="unitId" label="Affected unit">
                <option value="">Select Unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.unitNumber}
                  </option>
                ))}
              </SelectField>
            )}

            {targetType === "ROOM" && (
              <SelectField name="roomId" label="Affected room">
                <option value="">Select Room</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.unitNumber} / {room.number} - {room.name}
                  </option>
                ))}
              </SelectField>
            )}
          </div>
        </FormSection>

        <FormSection
          title="2. Schedule and maintenance details"
          description="Dates are inclusive in this form. Explain the operational problem so front-desk and maintenance staff understand the block."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&_.form-group]:mb-0">
              <InputField name="startDate" label="Unavailable from" type="date" />
              <InputField name="endDate" label="Unavailable through" type="date" />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Example: 11 Aug through 12 Aug blocks both nights. Inventory can be sold again from 13 Aug.
          </p>

          <div className="mt-5 [&_.form-group]:mb-0 [&_textarea]:min-h-28 [&_textarea]:resize-none">
            <TextareaField
              name="reason"
              label="Maintenance reason"
              rows={4}
              placeholder="Example: Gas leak detected in the kitchen line; room requires inspection and repair."
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Describe the problem for front-desk and maintenance staff.
            </p>
          </div>
        </FormSection>

        <FormSection
          title="3. Workflow"
          description="Priority controls operational urgency. It does not bypass booking-conflict protection."
        >
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              Operational priority
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 transition ${
                    priority === option.value
                      ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <input
                      type="radio"
                      value={option.value}
                      {...register("priority")}
                      className="mt-1 h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Emergency priority does not bypass reservation conflicts.
            </p>
          </fieldset>

          {isEditing && (
            <div className="mt-5 max-w-sm">
              <SelectField name="status" label="Workflow status">
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectField>
            </div>
          )}
          {isEditing && status === "RESOLVED" && (
            <div className="mt-5">
              <TextareaField
                name="resolutionNote"
                label="Required resolution note"
                rows={3}
                placeholder="Describe what was repaired, tested, and approved before reopening inventory."
              />
            </div>
          )}
        </FormSection>

        <section className={`rounded-xl border p-4 sm:p-5 ${emergencyOverride ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <input
              id="maintenance-emergency-override"
              type="checkbox"
              {...register("emergencyOverride")}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="maintenance-emergency-override" className="min-w-0 cursor-pointer">
              <span className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                Allow emergency override of reservation conflicts
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                  Exceptional action
                </span>
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600">
                Use only when urgent maintenance must proceed despite a confirmed or checked-in reservation.
              </span>
            </label>
          </div>

          {emergencyOverride && (
            <div className="mt-4 space-y-4 border-t border-amber-200 pt-4">
              <div className="rounded-lg bg-white/70 p-3 text-xs leading-5 text-amber-900">
                <p>
                  <strong>Result:</strong> creates the block and an audit event. It does not cancel, move, refund, or notify the guest.
                </p>
                <p className="mt-1">
                  Staff must separately coordinate relocation or another guest resolution.
                </p>
              </div>
              <div className="[&_.form-group]:mb-0">
                <TextareaField
                  name="emergencyReason"
                  label="Why must this proceed despite active reservations?"
                  rows={3}
                  placeholder="Example: Immediate gas-leak risk; relocation approved under incident INC-1042."
                />
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  Required audit justification—not the maintenance reason.
                </p>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
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
