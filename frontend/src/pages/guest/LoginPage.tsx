import { Navigate } from "react-router-dom";

import Button from "@/components/ui/Button";
import LoginForm from "@/features/auth/components/LoginForm";

import { ROUTES } from "@/configs/routePaths";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return (
    <>
      <LoginForm />

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-default/10" />
        <span className="text-xs text-muted">OR</span>
        <div className="h-px flex-1 bg-default/10" />
      </div>

      <div className="text-center space-y-3">
        <p className="text-sm text-muted">Don&apos;t have an account?</p>

        <Button variant="secondary" fullWidth to={ROUTES.REGISTER}>
          Create a new account
        </Button>
      </div>
    </>
  );
}
