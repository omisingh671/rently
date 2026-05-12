import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/configs/appConfig";
import { ROUTES } from "@/configs/routePaths";
import { ADMIN_ROUTES, adminPath } from "@/configs/routePathsAdmin";

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
 * Admin auth-page guard
 * - Blocks authenticated dashboard users from login/reset pages
 **/
export function RequireUnauthenticatedAdmin() {
  const { status, user } = useAuthStore();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated" && user) {
    return <Navigate to={adminPath(ADMIN_ROUTES.DASHBOARD)} replace />;
  }

  return <Outlet />;
}

/**
 * Role guard
 * - Enforced after RequireAuth
 **/
export function RequireRole({ roles }: { roles: readonly UserRole[] }) {
  const { status, user } = useAuthStore();

  if (status !== "authenticated" || !user || !roles.includes(user.role)) {
    throw new Response("Forbidden", {
      status: 403,
      statusText: "Forbidden",
    });
  }

  return <Outlet />;
}
