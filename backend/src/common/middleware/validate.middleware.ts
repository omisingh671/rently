import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

import { HttpError } from "@/common/errors/http-error.js";

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        result.error.issues[0]?.message ?? "Invalid request",
      );
    }

    req.body = result.data;
    next();
  };
