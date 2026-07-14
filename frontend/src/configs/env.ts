const DEFAULT_DEV_API_BASE_URL = "http://localhost:4000";
const DEFAULT_API_PREFIX = "/api/v1";
const DEFAULT_APP_NAME = "Sucasa";

type PublicEnv = {
  appName: string;
  tenantSlug: string;
  propertySlug: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  mockPaymentsEnabled: boolean;
  apiBaseUrl: string;
  apiPrefix: string;
};

const readEnv = (key: string): string | undefined => {
  const value = import.meta.env[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const readRequiredEnv = (key: string): string => {
  const value = readEnv(key);
  if (value === undefined) {
    throw new Error(`${key} is required`);
  }

  return value;
};

const readBooleanEnv = (key: string, defaultValue = false): boolean => {
  const value = readEnv(key);
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error(`${key} must be either true or false`);
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
  tenantSlug: readRequiredEnv("VITE_TENANT_SLUG"),
  propertySlug: readEnv("VITE_PROPERTY_SLUG") ?? null,
  supportEmail: readEnv("VITE_SUPPORT_EMAIL") ?? null,
  supportPhone: readEnv("VITE_SUPPORT_PHONE") ?? null,
  mockPaymentsEnabled:
    import.meta.env.DEV && readBooleanEnv("VITE_ENABLE_MOCK_PAYMENTS"),
  apiBaseUrl: normalizeApiBaseUrl(
    readEnv("VITE_API_BASE_URL") ??
      readEnv("VITE_API_BASE") ??
      defaultApiBaseUrl,
  ),
  apiPrefix: normalizeApiPrefix(
    readEnv("VITE_API_PREFIX") ?? DEFAULT_API_PREFIX,
  ),
};
