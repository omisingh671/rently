import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs";

import { useChangePassword } from "@/features/profile/hooks";
import { normalizeApiError } from "@/utils/errors";

const passwordSchema = z.string().superRefine((value, ctx) => {
  const messages = [
    value.length < 8 ? "Password must be at least 8 characters" : null,
    value.length > 128 ? "Password must be at most 128 characters" : null,
    /[a-z]/.test(value) ? null : "Password must contain a lowercase letter",
    /[A-Z]/.test(value) ? null : "Password must contain an uppercase letter",
    /\d/.test(value) ? null : "Password must contain a number",
    /[^A-Za-z0-9]/.test(value) ? null : "Password must contain a symbol",
  ].filter((message): message is string => message !== null);

  if (messages.length === 0) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: messages.join(". "),
  });
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        path: ["confirmPassword"],
        message: "Passwords do not match",
        code: z.ZodIssueCode.custom,
      });
    }
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
          <p className="text-xs text-slate-500 mt-1">
            Password must be at least 8 characters, and contain at least one uppercase letter, one number, and one symbol.
          </p>

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
