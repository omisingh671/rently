import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import { env } from "@/config/env.js";

import { ZodError } from "zod";
import { HttpError } from "@/common/errors/http-error.js";

// Routers
import authRouter from "@/modules/auth/auth.routes.js";
import usersRouter from "@/modules/users/users.routes.js";
import { dashboardRouter } from "@/modules/dashboard/index.js";
import { publicRouter } from "@/modules/public/index.js";

const API_PREFIX = env.API_PREFIX;
const allowedOrigins = [
  env.FRONTEND_URL,
  env.DASHBOARD_URL,
  ...(env.NODE_ENV === "development"
    ? ["http://localhost:5173", "http://localhost:5174"]
    : []),
].filter((origin): origin is string => Boolean(origin));

export const app = express();

/**
 * --------------------------------------------------
 * CORS (MUST be first)
 * --------------------------------------------------
 */
app.use(
  cors({
    origin: allowedOrigins,
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
app.use(express.json());
app.use(cookieParser());

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
        details: err.issues,
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
