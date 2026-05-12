import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";

import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "./resetPassword.schema";
import { useResetPassword } from "@/features/auth/hooks";

export default function ResetPasswordForm({ token }: { token: string }) {
  const mutation = useResetPassword();

  const methods = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onTouched",
  });

  const { handleSubmit, setError, clearErrors, control } = methods;
  const password = useWatch({ control, name: "password" });
  const confirmPassword = useWatch({ control, name: "confirmPassword" });

  const onSubmit = (values: ResetPasswordFormValues) => {
    clearErrors("root.server");

    mutation.mutate(
      { token, password: values.password },
      {
        onError: (err) => {
          setError("root.server", {
            type: "server",
            message: err.message,
          });
        },
      },
    );
  };

  useEffect(() => {
    clearErrors("root.server");
  }, [password, confirmPassword, clearErrors]);

  if (mutation.isSuccess) {
    return (
      <p className="text-sm text-success">
        Password updated successfully. You can now log in.
      </p>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorSummary />

        <InputField
          name="password"
          label="New password"
          type="password"
          required
        />

        <InputField
          name="confirmPassword"
          label="Confirm password"
          type="password"
          required
        />

        <Button type="submit" className="mt-5" disabled={mutation.isPending}>
          {mutation.isPending ? "Updating…" : "Reset password"}
        </Button>
      </form>
    </FormProvider>
  );
}
