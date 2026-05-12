import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@/common/utils/jwt.js";
import { HttpError } from "../errors/http-error.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing access token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing access token");
  }

  const payload = verifyAccessToken(token);

  req.user = {
    userId: payload.sub,
    role: payload.role,
  };

  next();
};
