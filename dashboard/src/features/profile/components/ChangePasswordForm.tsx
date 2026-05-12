import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs";

import { useChangePassword } from "@/features/profile/hooks";
import { normalizeApiError } from "@/utils/errors";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordForm() {
  const mutation = useChangePassword();

  const methods = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onTouched",
  });

  const {
    handleSubmit,
    control,
    clearErrors,
    setError,
    formState: { isDirty, isValid },
  } = methods;

  const onSubmit = (values: ChangePasswordFormValues) => {
    clearErrors("root.server");

    mutation.mutate(
      {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onError: (err) => {
          setError("root.server", {
            type: "server",
            message:
              normalizeApiError(err).message ?? "Failed to change password",
          });
        },
      },
    );
  };

  /* Clear server error on change */
  const currentPassword = useWatch({ control, name: "currentPassword" });
  const newPassword = useWatch({ control, name: "newPassword" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });

  useEffect(() => {
    clearErrors("root.server");
  }, [currentPassword, newPassword, confirmPassword, clearErrors]);

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 max-w-md"
          noValidate
        >
          <ErrorSummary />

          <InputField
            name="currentPassword"
            label="Current password"
            type="password"
            required
          />

          <InputField
            name="newPassword"
            label="New password"
            type="password"
            required
          />

          <InputField
            name="confirmPassword"
            label="Confirm new password"
            type="password"
            required
          />

          <div className="flex items-center gap-4 pt-2">
            <Button
              type="submit"
              disabled={!isDirty || !isValid || mutation.isPending}
            >
              {mutation.isPending ? "Updating..." : "Update password"}
            </Button>

            {mutation.isSuccess && (
              <span className="text-sm text-green-600">
                Password updated successfully
              </span>
            )}
          </div>
        </form>
      </FormProvider>
    </>
  );
}
