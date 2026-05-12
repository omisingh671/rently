const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000";
const DEFAULT_API_PREFIX = "/api/v1";
const DEFAULT_APP_NAME = "Sucasa";
const DEFAULT_TENANT_SLUG = "sucasa";
const DEFAULT_SUPPORT_EMAIL = "support@sucasahomes.com";
const DEFAULT_SUPPORT_PHONE = "+91 8099480994";

type PublicEnv = {
  appName: string;
  tenantSlug: string;
  supportEmail: string;
  supportPhone: string;
  apiBaseUrl: string;
  apiPrefix: string;
};

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const stripTrailingSlash = (value: string): string =>
  value.endsWith("/") ? value.replace(/\/+$/, "") : value;

const normalizeApiBaseUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return stripTrailingSlash(url.toString());
  } catch {
    throw new Error(
      "VITE_API_BASE_URL must be an absolute URL, for example http://localhost:4000",
    );
  }
};

const normalizeApiPrefix = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) {
    throw new Error("VITE_API_PREFIX must start with /");
  }

  return stripTrailingSlash(trimmed);
};

const defaultApiBaseUrl = import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : "";

export const publicEnv: PublicEnv = {
  appName: readEnv("VITE_APP_NAME") ?? DEFAULT_APP_NAME,
  tenantSlug: readEnv("VITE_TENANT_SLUG") ?? DEFAULT_TENANT_SLUG,
  supportEmail: readEnv("VITE_SUPPORT_EMAIL") ?? DEFAULT_SUPPORT_EMAIL,
  supportPhone: readEnv("VITE_SUPPORT_PHONE") ?? DEFAULT_SUPPORT_PHONE,
  apiBaseUrl: normalizeApiBaseUrl(
    readEnv("VITE_API_BASE_URL") ?? readEnv("VITE_API_BASE") ?? defaultApiBaseUrl,
  ),
  apiPrefix: normalizeApiPrefix(
    readEnv("VITE_API_PREFIX") ?? DEFAULT_API_PREFIX,
  ),
};
