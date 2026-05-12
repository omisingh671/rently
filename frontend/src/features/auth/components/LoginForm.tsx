import { useEffect } from "react";
import { useForm, FormProvider, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";

import Button from "@/components/ui/Button";
import { InputField } from "@/components/inputs/InputField/InputField";
import { ErrorSummary } from "@/components/inputs/ErrorSummary";

import { useLogin } from "@/features/auth/hooks";
import type { LoginPayload } from "@/features/auth/types";
import { loginSchema, type LoginFormValues } from "./login.schema";

import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/configs/routePaths";

type LocationState = {
  from?: {
    pathname?: string;
    state?: unknown;
  };
};

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  const loginMutation = useLogin();
  const user = useAuthStore((s) => s.user);

  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "guest@sucasa.com",
      password: "Guest@123",
    },
  });

  const { handleSubmit, setError, clearErrors, control } = methods;

  const onSubmit = (data: LoginFormValues) => {
    clearErrors("root.server");

    loginMutation.mutate(data as LoginPayload, {
      onError: (error) => {
        setError("root.server", {
          type: "server",
          message: error.message,
        });
      },
    });
  };

  const email = useWatch({ control, name: "email" });
  const password = useWatch({ control, name: "password" });

  useEffect(() => {
    clearErrors("root.server");
  }, [email, password, clearErrors]);

  useEffect(() => {
    if (!loginMutation.isSuccess || !user) return;

    const fromPath = locationState?.from?.pathname;

    // Restore intended route if allowed
    if (fromPath) {
      navigate(fromPath, {
        replace: true,
        state: locationState?.from?.state,
      });
      return;
    }

    // Role-based default
    navigate(ROUTES.HOME, { replace: true });
  }, [loginMutation.isSuccess, user, navigate, locationState]);

  if (loginMutation.isSuccess) {
    return (
      <div className="py-8 text-center text-sm text-muted">Signing you in…</div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <ErrorSummary />

        <InputField
          id="email"
          name="email"
          label="Email"
          type="email"
          required
        />
        <InputField
          id="password"
          name="password"
          label="Password"
          type="password"
          required
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>

          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
          >
            Forgot password?
          </button>
        </div>
      </form>
    </FormProvider>
  );
}
