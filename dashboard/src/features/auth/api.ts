/**
 * Auth API
 * ------------------------------------------------------------------------
 * Backend response envelope:
 * {
 *   success: boolean;
 *   data?: T;
 *   message?: string;
 *   devResetToken?: string; // DEV ONLY
 * }
 * ------------------------------------------------------------------------
 */

import { axiosRaw } from "@/api/axios";
import axiosInstance from "@/api/axios";

import type {
  AuthUser,
  LoginPayload,
  LoginResponse,
} from "./types";

import { API_ENDPOINTS } from "@/configs/apiEndpoints";
import { USER_ROLES, type UserRole } from "@/configs/appConfig";
import { createAppError, type AppErrorType } from "@/utils/appError";
import { normalizeApiError } from "@/utils/errors";
import type { AppError } from "@/utils/appError";

/* Standard backend response envelope */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  devResetToken?: string;
}

function isDashboardRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

function isAppError(err: unknown): err is AppError {
  if (typeof err !== "object" || err === null) return false;

  const candidate = err as { type?: unknown; message?: unknown };
  const validTypes: readonly AppErrorType[] = ["FORM", "AUTH", "SYSTEM"];

  return (
    typeof candidate.message === "string" &&
    typeof candidate.type === "string" &&
    validTypes.includes(candidate.type as AppErrorType)
  );
}

function assertDashboardUser(response: LoginResponse): LoginResponse {
  if (!isDashboardRole(response.user.role)) {
    throw createAppError("AUTH", "This account cannot access the dashboard.");
  }

  return response;
}

/**
 * LOGIN
 * POST /auth/login
 */
export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  try {
    const res = await axiosRaw.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.auth.login,
      payload,
    );

    return assertDashboardUser(res.data.data as LoginResponse);
  } catch (err) {
    if (isAppError(err)) {
      throw err;
    }

    throw normalizeApiError(err) as AppError;
  }
};

/**
 * REFRESH TOKEN
 * POST /auth/refresh
 */
export const refresh = async (): Promise<LoginResponse> => {
  const res = await axiosRaw.post<ApiResponse<LoginResponse>>(
    API_ENDPOINTS.auth.refreshToken,
  );

  return assertDashboardUser(res.data.data as LoginResponse);
};

/**
 * LOGOUT
 * POST /auth/logout
 */
export const logout = async (): Promise<void> => {
  await axiosRaw.post(API_ENDPOINTS.auth.logout);
};

/**
 * AUTH ME
 * GET /auth/me
 */
export const me = async (): Promise<{ user: AuthUser }> => {
  const res = await axiosInstance.get<ApiResponse<{ user: AuthUser }>>(
    API_ENDPOINTS.auth.me,
  );

  const data = res.data.data as { user: AuthUser };
  if (!isDashboardRole(data.user.role)) {
    throw createAppError("AUTH", "This account cannot access the dashboard.");
  }

  return data;
};

/**
 * FORGOT PASSWORD
 * POST /auth/forgot-password
 *
 * In DEV:
 *  - devResetToken is returned for testing
 */
export const forgotPassword = async (
  email: string,
): Promise<{ message: string; devResetToken?: string }> => {
  try {
    const res = await axiosRaw.post<ApiResponse<null>>(
      API_ENDPOINTS.auth.forgotPassword,
      { email },
    );

    return {
      message:
        res.data.message ?? "If an account exists, a reset link has been sent.",
      ...(import.meta.env.DEV &&
        res.data.devResetToken && {
          devResetToken: res.data.devResetToken,
        }),
    };
  } catch (err) {
    throw normalizeApiError(err) as AppError;
  }
};

/**
 * RESET PASSWORD
 * POST /auth/reset-password
 */
export const resetPassword = async (payload: {
  token: string;
  password: string;
}): Promise<{ message: string }> => {
  try {
    const res = await axiosRaw.post<ApiResponse<null>>(
      API_ENDPOINTS.auth.resetPassword,
      payload,
    );

    return {
      message: res.data.message ?? "Password has been reset successfully.",
    };
  } catch (err) {
    throw normalizeApiError(err) as AppError;
  }
};
