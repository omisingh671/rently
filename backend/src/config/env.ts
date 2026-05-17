import { z } from "zod";

const rawEnvSchema = z.object({
  API_PREFIX: z.string(),

  NODE_ENV: z.enum(["development", "test", "staging", "production"]),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  // examples: "900", "15m", "7d"
  JWT_ACCESS_EXPIRES_IN: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string(),

  // EMAIL CONFIG
  MAIL_USER: z.string().email(),
  MAIL_APP_PASS: z.string().min(16),
  MAIL_FROM: z.string().email().optional(),

  // Public app origins
  FRONTEND_URL: z.string().url(),
  DASHBOARD_URL: z.string().url().optional(),

  // Rate limiting
  RATE_LIMIT_ENABLED: z.enum(["true", "false"]).optional(),
  RATE_LIMIT_DEV_LOCALHOST_BYPASS: z.enum(["true", "false"]).optional(),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  PUBLIC_ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
  PUBLIC_BOOKING_RATE_LIMIT_MAX: z.coerce.number().int().positive().optional(),
});

const raw = rawEnvSchema.superRefine((value, ctx) => {
  if (value.NODE_ENV !== "development" && !value.DASHBOARD_URL) {
    ctx.addIssue({
      code: "custom",
      path: ["DASHBOARD_URL"],
      message: "DASHBOARD_URL is required outside development.",
    });
  }
}).parse(process.env);

/**
 * Convert JWT expiry into seconds (number)
 */
function parseJwtExpiresIn(value: string): number {
  // numeric string → seconds
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  // duration strings → seconds
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid JWT expiresIn value: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      throw new Error(`Invalid JWT expiresIn unit: ${unit}`);
  }
}

export const env = {
  API_PREFIX: raw.API_PREFIX,

  NODE_ENV: raw.NODE_ENV,

  JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET,

  MAIL_USER: raw.MAIL_USER,
  MAIL_APP_PASS: raw.MAIL_APP_PASS,
  MAIL_FROM: raw.MAIL_FROM ?? raw.MAIL_USER,

  FRONTEND_URL: raw.FRONTEND_URL,
  DASHBOARD_URL: raw.DASHBOARD_URL,

  RATE_LIMIT_ENABLED:
    raw.RATE_LIMIT_ENABLED !== undefined
      ? raw.RATE_LIMIT_ENABLED === "true"
      : raw.NODE_ENV !== "test",
  RATE_LIMIT_DEV_LOCALHOST_BYPASS:
    raw.RATE_LIMIT_DEV_LOCALHOST_BYPASS !== undefined
      ? raw.RATE_LIMIT_DEV_LOCALHOST_BYPASS === "true"
      : raw.NODE_ENV === "development",
  AUTH_RATE_LIMIT_MAX: raw.AUTH_RATE_LIMIT_MAX ?? 20,
  PUBLIC_ENQUIRY_RATE_LIMIT_MAX: raw.PUBLIC_ENQUIRY_RATE_LIMIT_MAX ?? 8,
  PUBLIC_BOOKING_RATE_LIMIT_MAX: raw.PUBLIC_BOOKING_RATE_LIMIT_MAX ?? 12,

  // FINAL TYPES: number
  JWT_ACCESS_EXPIRES_IN: parseJwtExpiresIn(raw.JWT_ACCESS_EXPIRES_IN),
  JWT_REFRESH_EXPIRES_IN: parseJwtExpiresIn(raw.JWT_REFRESH_EXPIRES_IN),
} as const;
