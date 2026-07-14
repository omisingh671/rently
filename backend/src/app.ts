import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import multer from "multer";

import { env } from "@/config/env.js";

import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { requestContextMiddleware, getCorrelationId } from "@/common/observability/request-context.js";
import { logError } from "@/common/observability/logger.js";

// Routers
import authRouter from "@/modules/auth/auth.routes.js";
import usersRouter from "@/modules/users/users.routes.js";
import { sessionsRouter } from "@/modules/sessions/index.js";
import { propertyAssignmentsRouter } from "@/modules/property-assignments/index.js";
import { reportingRouter } from "@/modules/reporting/index.js";
import { publicRouter } from "@/modules/public/index.js";
import { galleriesRouter } from "@/modules/galleries/index.js";
import { tenantsRouter } from "@/modules/tenants/index.js";
import { amenitiesRouter } from "@/modules/amenities/index.js";
import { propertiesRouter } from "@/modules/properties/index.js";
import { unitRouter } from "@/modules/units/index.js";
import { roomRouter } from "@/modules/rooms/index.js";
import { maintenanceRouter } from "@/modules/maintenance/index.js";
import { roomProductRouter } from "@/modules/room-products/index.js";
import { bookingPolicyRouter } from "@/modules/booking-policy/index.js";
import { billingRouter } from "@/modules/billing/index.js";
import { pricingRouter } from "@/modules/pricing/index.js";
import { taxesRouter } from "@/modules/taxes/index.js";
import { couponsRouter } from "@/modules/coupons/index.js";
import { leadsRouter } from "@/modules/leads/index.js";
import bookingsRouter from "@/modules/bookings/index.js";
import emailDeliveriesRouter from "@/modules/email-deliveries/email-deliveries.routes.js";


const API_PREFIX = env.API_PREFIX;
const allowedOrigins = Array.from(
  new Set(
    [
      env.FRONTEND_URL,
      env.DASHBOARD_URL,
      ...(env.NODE_ENV === "development"
        ? ["http://localhost:5173", "http://localhost:5174"]
        : []),
    ].filter((origin): origin is string => Boolean(origin)),
  ),
);

const validateAllowedOrigins = (origins: string[]) => {
  if (env.NODE_ENV === "production") {
    const unsafeOrigin = origins.find((origin) => {
      const parsed = new URL(origin);
      return (
        parsed.protocol !== "https:" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      );
    });

    if (unsafeOrigin) {
      throw new Error(`Unsafe production CORS origin: ${unsafeOrigin}`);
    }
  }
};

validateAllowedOrigins(allowedOrigins);

const localRateLimitIps = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);

const shouldSkipRateLimit = (req: Request) =>
  !env.RATE_LIMIT_ENABLED ||
  (env.NODE_ENV === "development" &&
    env.RATE_LIMIT_DEV_LOCALHOST_BYPASS &&
    localRateLimitIps.has(req.ip ?? ""));

const buildRateLimit = (windowMs: number, max: number, code: string) =>
  rateLimit({
    windowMs,
    max,
    skip: shouldSkipRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code,
        message: "Too many requests. Please try again later.",
      },
    },
  });

const authRateLimit = buildRateLimit(
  15 * 60 * 1000,
  env.AUTH_RATE_LIMIT_MAX,
  "AUTH_RATE_LIMITED",
);
const publicEnquiryRateLimit = buildRateLimit(
  15 * 60 * 1000,
  env.PUBLIC_ENQUIRY_RATE_LIMIT_MAX,
  "ENQUIRY_RATE_LIMITED",
);
const publicBookingRateLimit = buildRateLimit(
  10 * 60 * 1000,
  env.PUBLIC_BOOKING_RATE_LIMIT_MAX,
  "BOOKING_RATE_LIMITED",
);

export const app = express();
app.use(requestContextMiddleware);

/**
 * --------------------------------------------------
 * CORS (MUST be first)
 * --------------------------------------------------
 */
app.use(
  cors({
    origin: (origin, callback) => {
      if (origin === undefined || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-app-name",
      "x-app-client",
      "x-tenant-slug",
      "x-property-slug",
      "Idempotency-Key",
    ],
  }),
);

/**
 * --------------------------------------------------
 * Global Middlewares
 * --------------------------------------------------
 */
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use("/uploads", express.static(path.resolve("uploads")));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));
app.use(cookieParser());

app.use(`${API_PREFIX}/auth/login`, authRateLimit);
app.use(`${API_PREFIX}/auth/register`, authRateLimit);
app.use(`${API_PREFIX}/auth/forgot-password`, authRateLimit);
app.use(`${API_PREFIX}/public/enquiries`, publicEnquiryRateLimit);
app.use(`${API_PREFIX}/public/bookings`, publicBookingRateLimit);

/**
 * --------------------------------------------------
 * Health Check
 * --------------------------------------------------
 */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * --------------------------------------------------
 * API Routes
 * --------------------------------------------------
 */
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/users`, usersRouter);
app.use(`${API_PREFIX}/sessions`, sessionsRouter);
app.use(`${API_PREFIX}/property-assignments`, propertyAssignmentsRouter);
app.use(`${API_PREFIX}/reporting`, reportingRouter);
app.use(`${API_PREFIX}/public`, publicRouter);
app.use(`${API_PREFIX}/galleries`, galleriesRouter);
app.use(`${API_PREFIX}/tenants`, tenantsRouter);
app.use(`${API_PREFIX}/amenities`, amenitiesRouter);
app.use(`${API_PREFIX}/properties`, propertiesRouter);
app.use(`${API_PREFIX}`, unitRouter);
app.use(`${API_PREFIX}`, roomRouter);
app.use(`${API_PREFIX}`, maintenanceRouter);
app.use(`${API_PREFIX}`, roomProductRouter);
app.use(`${API_PREFIX}`, bookingPolicyRouter);
app.use(`${API_PREFIX}`, billingRouter);
app.use(`${API_PREFIX}`, pricingRouter);
app.use(`${API_PREFIX}`, taxesRouter);
app.use(`${API_PREFIX}`, couponsRouter);
app.use(`${API_PREFIX}`, leadsRouter);
app.use(`${API_PREFIX}`, bookingsRouter);
app.use(`${API_PREFIX}`, emailDeliveriesRouter);


/**
 * --------------------------------------------------
 * 404 Handler
 * --------------------------------------------------
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found",
    },
  });
});

/**
 * --------------------------------------------------
 * Global Error Handler
 * --------------------------------------------------
 */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const correlationId = getCorrelationId();
  logError("Request failed", err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        correlationId,
        ...(err.details !== undefined && { details: err.details }),
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        correlationId,
        details: err.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      },
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: {
        code: err.code,
        message:
          err.code === "LIMIT_FILE_SIZE"
            ? "Image file must be 10MB or smaller"
            : "Invalid file upload",
        correlationId,
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "Something went wrong",
        correlationId,
      },
    });
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
      correlationId,
    },
  });
});
