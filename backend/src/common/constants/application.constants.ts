export const API_PREFIX = "/api/v1";

export const AUTH_TOKEN_TTL_SECONDS = {
  access: 15 * 60,
  refresh: 7 * 24 * 60 * 60,
} as const;

export const RATE_LIMIT_POLICY = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 20,
  },
  publicEnquiry: {
    windowMs: 15 * 60 * 1000,
    max: 8,
  },
  publicBooking: {
    windowMs: 10 * 60 * 1000,
    max: 12,
  },
  bypassLocalhostInDevelopment: true,
} as const;

export const DATABASE_DEFAULTS = {
  port: 3306,
  connectionLimit: 5,
} as const;

export const STORAGE_PATHS = {
  localDirectory: "uploads",
  localPublicPath: "/uploads",
  s3KeyPrefix: "uploads",
} as const;

export const SEED_SUPER_ADMIN_PROFILE = {
  fullName: "Super Admin",
  countryCode: "+91",
  contactNumber: "0000000000",
} as const;

export const E2E_DEFAULTS = {
  databaseName: "rently_e2e",
  port: 4100,
} as const;

export const COMMERCIAL_POLICY = {
  quoteValidityDays: 7,
} as const;

export const SIDE_EFFECT_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 30_000,
  maxDelayMs: 15 * 60_000,
  staleProcessingMs: 5 * 60_000,
  processorIntervalMs: 30_000,
  batchSize: 20,
} as const;

export const getSideEffectRetryAt = (attemptCount: number, at = new Date()) =>
  new Date(
    at.getTime() +
      Math.min(
        SIDE_EFFECT_RETRY_POLICY.baseDelayMs *
          2 ** Math.max(0, attemptCount - 1),
        SIDE_EFFECT_RETRY_POLICY.maxDelayMs,
      ),
  );
