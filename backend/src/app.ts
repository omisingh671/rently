import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env } from "@/config/env.js";

import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";

// Routers
import authRouter from "@/modules/auth/auth.routes.js";
import usersRouter from "@/modules/users/users.routes.js";
import { dashboardRouter } from "@/modules/dashboard/index.js";
import { publicRouter } from "@/modules/public/index.js";

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

const buildRateLimit = (windowMs: number, max: number, code: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code,
        message: "Too many requests. Please try again later.",
      },
    },
  });

const authRateLimit = buildRateLimit(15 * 60 * 1000, 20, "AUTH_RATE_LIMITED");
const publicEnquiryRateLimit = buildRateLimit(
  15 * 60 * 1000,
  8,
  "ENQUIRY_RATE_LIMITED",
);
const publicBookingRateLimit = buildRateLimit(
  10 * 60 * 1000,
  12,
  "BOOKING_RATE_LIMITED",
);

export const app = express();

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
      "x-tenant-slug",
      "Idempotency-Key",
    ],
  }),
);

/**
 * --------------------------------------------------
 * Global Middlewares
 * --------------------------------------------------
 */
app.use(helmet());
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
app.use(`${API_PREFIX}/dashboard`, dashboardRouter);
app.use(`${API_PREFIX}/public`, publicRouter);

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
  console.error(err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: err.issues.map((issue) => ({
          code: issue.code,
          path: issue.path,
          message: issue.message,
        })),
      },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(500).json({
      error: {
        code: "DATABASE_ERROR",
        message: "Something went wrong",
      },
    });
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Something went wrong",
    },
  });
});
