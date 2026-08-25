import type { RequestHandler } from "express";
import { HttpError } from "@/common/errors/http-error.js";

export const buildBrowserOriginGuard = (
  allowedOrigins: readonly string[],
): RequestHandler => {
  const allowed = new Set(allowedOrigins);

  return (req, _res, next) => {
    const origin = req.headers.origin;
    if (origin === undefined || allowed.has(origin)) {
      next();
      return;
    }

    throw new HttpError(
      403,
      "ORIGIN_FORBIDDEN",
      "Request origin is not allowed",
    );
  };
};
