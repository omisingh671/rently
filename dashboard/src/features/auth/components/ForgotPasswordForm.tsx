import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";
import { ROUTES } from "@/configs/routePaths";

import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "./forgotPassword.schema";

import { useForgotPassword } from "@/features/auth/hooks";

export default function ForgotPasswordForm() {
  const mutation = useForgotPassword();

  const methods = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onTouched",
  });

  const { handleSubmit, setError, clearErrors, control } = methods;
  const email = useWatch({ control, name: "email" });

  const onSubmit = (values: ForgotPasswordFormValues) => {
    clearErrors("root.server");

    mutation.mutate(
      { email: values.email },
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
  }, [email, clearErrors]);

  if (mutation.isSuccess) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          If an account exists, a reset link has been sent.
        </p>

        {import.meta.env.DEV && mutation.data?.devResetToken && (
          <div className="text-xs break-all bg-slate-100 p-3 rounded">
            DEV TOKEN: {mutation.data.devResetToken}
          </div>
        )}

        <Link to={ROUTES.LOGIN} className="text-primary text-sm">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorSummary />
        <InputField name="email" label="Email" type="email" required />

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Sending…" : "Send reset link"}
          </Button>
          <Link
            to={ROUTES.LOGIN}
            className="text-sm text-muted hover:text-primary hover:underline"
          >
            Cancel
          </Link>
        </div>
      </form>
    </FormProvider>
  );
}
