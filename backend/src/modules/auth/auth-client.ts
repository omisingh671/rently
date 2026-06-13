import { SessionAudience, UserRole } from "@/generated/prisma/enums.js";
import { HttpError } from "@/common/errors/http-error.js";

export const APP_CLIENT_HEADER = "x-app-client";

export const parseAppClient = (value: unknown): SessionAudience => {
  if (value === "frontend") {
    return SessionAudience.FRONTEND;
  }

  if (value === "dashboard") {
    return SessionAudience.DASHBOARD;
  }

  throw new HttpError(
    400,
    "APP_CLIENT_REQUIRED",
    "X-App-Client must be frontend or dashboard",
  );
};

export const assertRoleAllowedForAudience = (
  role: UserRole,
  audience: SessionAudience,
) => {
  const allowed =
    audience === SessionAudience.FRONTEND
      ? role === UserRole.GUEST
      : role !== UserRole.GUEST;

  if (!allowed) {
    throw new HttpError(
      403,
      "APP_ROLE_FORBIDDEN",
      "This account cannot access the requested application",
    );
  }
};

export const getRefreshCookieName = (audience: SessionAudience) =>
  audience === SessionAudience.FRONTEND
    ? "frontendRefreshToken"
    : "dashboardRefreshToken";
