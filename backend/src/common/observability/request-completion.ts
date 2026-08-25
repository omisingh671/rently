import { performance } from "node:perf_hooks";
import type { NextFunction, Request, Response } from "express";
import { logInfo } from "./logger.js";

export const requestCompletionMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  const startedAt = performance.now();

  res.once("finish", () => {
    logInfo("Request completed", {
      status: res.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    });
  });

  next();
};
