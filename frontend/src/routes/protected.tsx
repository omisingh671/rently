import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/configs/routePaths";

/**
 * Auth guard
 * - Blocks unauthenticated users
 * - NEVER redirects while auth is resolving
 **/
export function RequireAuth() {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === "loading") {
    return null; // or a loader
  }

  if (status === "unauthenticated") {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <Outlet />;
}

/**
 * Guest guard
 * - Blocks authenticated users from auth pages
 **/
export function RequireGuest() {
  const { status, user } = useAuthStore();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated" && user) {
    return <Navigate to={ROUTES.HOME} replace />;
  }

  return <Outlet />;
}

