import { z } from "zod";

const rawEnvSchema = z.object({
  API_PREFIX: z.string(),

  NODE_ENV: z.enum(["development", "staging", "production"]),

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

  // FINAL TYPES: number
  JWT_ACCESS_EXPIRES_IN: parseJwtExpiresIn(raw.JWT_ACCESS_EXPIRES_IN),
  JWT_REFRESH_EXPIRES_IN: parseJwtExpiresIn(raw.JWT_REFRESH_EXPIRES_IN),
} as const;
