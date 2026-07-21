import { useEffect, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { SelectField } from "@/components/inputs/SelectField/SelectField";
import { ErrorSummary } from "@/components/inputs";

import {
  createUserFormSchema,
  createTeamUserFormSchema,
  editUserFormSchema,
  type UserFormValues,
} from "./user.schema";

type Props = {
  mode?: "create" | "edit";
  title?: string;
  submitLabel: string;
  isSubmitting?: boolean;
  initialValues?: Partial<UserFormValues>;
  roleOptions?: ReadonlyArray<{
    value: "MANAGER" | "FRONT_DESK" | "ACCOUNTANT";
    label: string;
  }>;
  onCancel?: () => void;
  onSubmit: (
    values: UserFormValues,
    setServerError: (message: string) => void,
  ) => Promise<void>;
};

export default function UserForm({
  mode = "create",
  title,
  submitLabel,
  isSubmitting = false,
  initialValues,
  roleOptions,
  onCancel,
  onSubmit,
}: Props) {
  const defaultValues = useMemo<UserFormValues>(
    () => ({
      fullName: initialValues?.fullName ?? "",
      email: initialValues?.email ?? "",
      password: "",
      countryCode: "+91",
      contactNumber: initialValues?.contactNumber ?? "",
      ...(roleOptions?.[0] && {
        role: initialValues?.role ?? roleOptions[0].value,
      }),
    }),
    [
      initialValues?.contactNumber,
      initialValues?.email,
      initialValues?.fullName,
      initialValues?.role,
      roleOptions,
    ],
  );

  const methods = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === "create"
        ? roleOptions
          ? createTeamUserFormSchema
          : createUserFormSchema
        : editUserFormSchema,
    ),
    defaultValues,
  });

  const { handleSubmit, clearErrors, setError, reset } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const submitHandler = async (values: UserFormValues) => {
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
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          )}
          <p className="mt-1 text-sm text-slate-500">
            {mode === "create"
              ? "Create a new dashboard account."
              : "Update dashboard account details."}
          </p>
        </div>

        <ErrorSummary />

        <InputField name="fullName" label="Full Name" />
        <InputField
          name="email"
          label="Email"
          type="email"
          readOnly={mode === "edit"}
        />
        {mode === "create" && (
          <InputField name="password" label="Password" type="password" />
        )}

        {mode === "create" && roleOptions && (
          <SelectField name="role" label="Role">
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField name="countryCode" label="Country Code" readOnly />
          <InputField name="contactNumber" label="Contact Number" />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row">
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
