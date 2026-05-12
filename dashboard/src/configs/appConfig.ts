import { publicEnv } from "./env";

// Public app meta. Values can be overridden with VITE_* env vars.
export const APP_NAME = publicEnv.appName;
export const SUPPORT_EMAIL = publicEnv.supportEmail;
export const SUPPORT_PHONE = publicEnv.supportPhone;
export const SUPPORT_PHONE_WA = SUPPORT_PHONE.replace(/\D/g, "");

// Dashboard roles
export const USER_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// Auth / tokens
export const TOKEN_TYPE = "Bearer";
export const REQUEST_HEADER_AUTH_KEY = "Authorization";
export const APP_HEADER_CLIENT_NAME_KEY = "X-APP-NAME";

// Storage keys
export const TOKEN_NAME_IN_STORAGE = "token";
export const REFRESH_TOKEN_NAME_IN_STORAGE = "refreshToken";

// API config. Base URL is environment-specific; prefix is the public API contract.
export const API_PREFIX = publicEnv.apiPrefix;
export const API_BASE_URL = publicEnv.apiBaseUrl;

// Axios / HTTP behaviour flags
export const AXIOS_WITH_CREDENTIALS = true;
