import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { getCorrelationId } from "@/common/observability/request-context.js";

type RateLimitSkip = (req: Request) => boolean;

export const buildRateLimit = (
  windowMs: number,
  max: number,
  code: string,
  skip?: RateLimitSkip,
) =>
  rateLimit({
    windowMs,
    max,
    ...(skip !== undefined && { skip }),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code,
          message: "Too many requests. Please try again later.",
          correlationId: getCorrelationId(),
        },
      });
    },
  });
