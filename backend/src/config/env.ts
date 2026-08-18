import { z } from "zod";

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]),

  // Authentication secrets
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),

  // Email provider
  MAIL_USER: z.string().email(),
  MAIL_APP_PASS: z.string().min(16),
  MAIL_FROM: z.string().email().optional(),

  // Public application origins
  FRONTEND_URL: z.string().url(),
  DASHBOARD_URL: z.string().url().optional(),

  // Deployment topology
  TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).optional(),

  // Storage infrastructure
  STORAGE_PROVIDER: z.enum(["local", "s3"]).optional(),
  AWS_REGION: z.string().min(1).optional(),
  S3_UPLOAD_BUCKET: z.string().min(1).optional(),
  S3_UPLOAD_PUBLIC_BASE_URL: z.string().url().optional(),

  // Online payments. Mock mode is allowed only outside production.
  PAYMENT_GATEWAY_MODE: z.enum(["mock", "live"]).optional(),
  PAYMENT_GATEWAY_PROVIDER: z.enum(["razorpay"]).optional(),
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
  RAZORPAY_API_BASE_URL: z.string().url().optional(),
});

const raw = rawEnvSchema
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== "development" && !value.DASHBOARD_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DASHBOARD_URL"],
        message: "DASHBOARD_URL is required outside development.",
      });
    }

    if (value.NODE_ENV === "production" && value.TRUST_PROXY_HOPS === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["TRUST_PROXY_HOPS"],
        message: "TRUST_PROXY_HOPS is required in production.",
      });
    }

    const storageProvider =
      value.STORAGE_PROVIDER ??
      (value.NODE_ENV === "production" ? "s3" : "local");

    if (value.NODE_ENV === "production" && storageProvider !== "s3") {
      ctx.addIssue({
        code: "custom",
        path: ["STORAGE_PROVIDER"],
        message: "STORAGE_PROVIDER must be s3 in production.",
      });
    }

    if (storageProvider === "s3") {
      const requiredS3Vars = [
        "AWS_REGION",
        "S3_UPLOAD_BUCKET",
        "S3_UPLOAD_PUBLIC_BASE_URL",
      ] as const;

      for (const key of requiredS3Vars) {
        if (!value[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required when STORAGE_PROVIDER is s3.`,
          });
        }
      }
    }

    const paymentMode = value.PAYMENT_GATEWAY_MODE ?? "mock";
    if (value.NODE_ENV === "production" && paymentMode !== "live") {
      ctx.addIssue({
        code: "custom",
        path: ["PAYMENT_GATEWAY_MODE"],
        message: "PAYMENT_GATEWAY_MODE must be live in production.",
      });
    }

    const paymentProvider = value.PAYMENT_GATEWAY_PROVIDER ?? "razorpay";
    if (paymentMode === "live" && paymentProvider === "razorpay") {
      for (const key of [
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
      ] as const) {
        if (!value[key]) {
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required for the live Razorpay gateway.`,
          });
        }
      }
    }
    if (
      value.NODE_ENV === "production" &&
      (value.RAZORPAY_KEY_ID?.startsWith("rzp_live_") !== true ||
        value.RAZORPAY_KEY_SECRET?.toLowerCase().includes("dummy") === true ||
        value.RAZORPAY_WEBHOOK_SECRET?.toLowerCase().includes("dummy") === true)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["RAZORPAY_KEY_ID"],
        message: "Production requires live Razorpay credentials, not test or dummy values.",
      });
    }
  })
  .parse(process.env);

export const env = {
  NODE_ENV: raw.NODE_ENV,

  JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET,

  MAIL_USER: raw.MAIL_USER,
  MAIL_APP_PASS: raw.MAIL_APP_PASS,
  MAIL_FROM: raw.MAIL_FROM ?? raw.MAIL_USER,

  FRONTEND_URL: raw.FRONTEND_URL,
  DASHBOARD_URL: raw.DASHBOARD_URL,

  TRUST_PROXY_HOPS: raw.TRUST_PROXY_HOPS ?? 0,

  STORAGE_PROVIDER:
    raw.STORAGE_PROVIDER ?? (raw.NODE_ENV === "production" ? "s3" : "local"),
  AWS_REGION: raw.AWS_REGION ?? "",
  S3_UPLOAD_BUCKET: raw.S3_UPLOAD_BUCKET ?? "",
  S3_UPLOAD_PUBLIC_BASE_URL: raw.S3_UPLOAD_PUBLIC_BASE_URL ?? "",

  PAYMENT_GATEWAY_MODE: raw.PAYMENT_GATEWAY_MODE ?? "mock",
  PAYMENT_GATEWAY_PROVIDER: raw.PAYMENT_GATEWAY_PROVIDER ?? "razorpay",
  RAZORPAY_KEY_ID: raw.RAZORPAY_KEY_ID ?? "rzp_test_dummy",
  RAZORPAY_KEY_SECRET: raw.RAZORPAY_KEY_SECRET ?? "dummy_key_secret",
  RAZORPAY_WEBHOOK_SECRET:
    raw.RAZORPAY_WEBHOOK_SECRET ?? "dummy_webhook_secret",
  RAZORPAY_API_BASE_URL:
    raw.RAZORPAY_API_BASE_URL ?? "https://api.razorpay.com/v1",
} as const;
