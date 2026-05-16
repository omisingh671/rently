import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { Location, To } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/configs/routePaths";

type RedirectLocation = Partial<
  Pick<Location, "pathname" | "search" | "hash" | "state">
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSafeRedirectPath = (value: string) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.includes("://") &&
  value !== ROUTES.LOGIN;

const resolveAuthRedirect = (
  state: unknown,
): { to: To; state?: unknown } | null => {
  if (!isRecord(state) || !isRecord(state.from)) return null;

  const from = state.from as RedirectLocation;
  const pathname = from?.pathname;

  if (typeof pathname !== "string" || !isSafeRedirectPath(pathname)) {
    return null;
  }

  return {
    to: {
      pathname,
      search: typeof from.search === "string" ? from.search : "",
      hash: typeof from.hash === "string" ? from.hash : "",
    },
    state: from.state,
  };
};

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
  const location = useLocation();

  if (status === "loading") {
    return null;
  }

  if (status === "authenticated" && user) {
    const redirect = resolveAuthRedirect(location.state);

    return (
      <Navigate
        to={redirect?.to ?? ROUTES.HOME}
        state={redirect?.state}
        replace
      />
    );
  }

  return <Outlet />;
}

