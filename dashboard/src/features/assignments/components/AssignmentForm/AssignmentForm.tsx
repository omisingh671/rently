import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { ErrorSummary } from "@/components/inputs";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import type { AdminUser } from "@/features/users/types";
import type { PropertyAssignmentRole } from "../../types";

import {
  assignmentFormSchema,
  type AssignmentFormValues,
} from "./assignment.schema";

export type AssignmentPropertyOption = {
  id: string;
  name: string;
};

type Props = {
  role: PropertyAssignmentRole;
  properties: AssignmentPropertyOption[];
  users: AdminUser[];
  defaultPropertyId?: string;
  isLoadingUsers?: boolean;
  isUsersError?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (
    values: AssignmentFormValues,
    setServerError: (message: string) => void,
  ) => Promise<void>;
};

export default function AssignmentForm({
  role,
  properties,
  users,
  defaultPropertyId,
  isLoadingUsers = false,
  isUsersError = false,
  isSubmitting = false,
  onCancel,
  onSubmit,
}: Props) {
  const methods = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      propertyId: defaultPropertyId ?? "",
      userId: "",
    },
  });

  const { handleSubmit, clearErrors, setError } = methods;

  const submitHandler = async (values: AssignmentFormValues) => {
    clearErrors("root.server");

    try {
      await onSubmit(values, (message) => {
        setError("root.server", {
          type: "server",
          message,
        });
      });
    } catch {
      return;
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(submitHandler)}
        className="space-y-6"
        noValidate
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Create {role === "ADMIN" ? "Admin" : "Manager"} Assignment
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Link a property to the selected user.
          </p>
        </div>

        <ErrorSummary />

        <SelectField name="propertyId" label="Property">
          <option value="">Select property</option>
          {properties.length === 0 && (
            <option value="" disabled>
              No properties available
            </option>
          )}
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          name="userId"
          label={role === "ADMIN" ? "Admin" : "Manager"}
        >
          <option value="">Select user</option>
          {isLoadingUsers && (
            <option value="" disabled>
              Loading {role === "ADMIN" ? "admins" : "managers"}...
            </option>
          )}
          {!isLoadingUsers && isUsersError && (
            <option value="" disabled>
              Failed to load {role === "ADMIN" ? "admins" : "managers"}
            </option>
          )}
          {!isLoadingUsers && !isUsersError && users.length === 0 && (
            <option value="" disabled>
              No {role === "ADMIN" ? "admins" : "managers"} available
            </option>
          )}
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName} ({user.email})
            </option>
          ))}
        </SelectField>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
          {onCancel && (
            <Button type="button" variant="dark" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              isLoadingUsers ||
              isUsersError ||
              properties.length === 0 ||
              users.length === 0
            }
          >
            {isSubmitting ? "Saving..." : "Create Assignment"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
