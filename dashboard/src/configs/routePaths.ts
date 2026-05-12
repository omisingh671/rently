export const ROUTES = {
  HOME: "/",

  LOGIN: "/login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: (token = ":token") => `/reset-password/${token}`,

  NOT_FOUND: "*",
} as const;

export type RouteKey = keyof typeof ROUTES;
