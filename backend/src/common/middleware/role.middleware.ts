import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.middleware.js";

import { HttpError } from "@/common/errors/http-error.js";

export const authorize =
  (allowedRoles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new HttpError(403, "FORBIDDEN", "Access Denied");
    }
    next();
  };
