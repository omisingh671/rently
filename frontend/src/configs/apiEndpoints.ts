/**
 * API Endpoints
 * ------------------------------------------------------------------------
 * Axios baseURL already includes: `${API_BASE_URL}${API_PREFIX}` → /api/v1
 * ------------------------------------------------------------------------
 */

export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    logout: "/auth/logout",
    refreshToken: "/auth/refresh",
    me: "/auth/me",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
  },

  users: {
    me: "/users/me",
    updateMe: "/users/me",
  },
} as const;
