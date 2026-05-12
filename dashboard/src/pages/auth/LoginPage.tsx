import { Navigate } from "react-router-dom";

import LoginForm from "@/features/auth/components/LoginForm";

import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Navigate to={adminPath(ADMIN_ROUTES.DASHBOARD)} replace />;
  }

  return (
    <>
      <LoginForm />
    </>
  );
}
