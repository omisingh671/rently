import type { Request, RequestHandler } from "express";
import { verifyAccessToken } from "@/common/utils/jwt.js";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "../errors/http-error.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

const getCurrentAuthUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "User not found");
  }

  if (!user.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }

  return user;
};

export const authenticate: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing access token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing access token");
  }

  const payload = verifyAccessToken(token);
  const user = await getCurrentAuthUser(payload.sub);

  (req as AuthRequest).user = {
    userId: user.id,
    role: user.role,
  };

  next();
};

export const optionalAuthenticate: RequestHandler = async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid access token");
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid access token");
  }

  const payload = verifyAccessToken(token);
  const user = await getCurrentAuthUser(payload.sub);

  (req as AuthRequest).user = {
    userId: user.id,
    role: user.role,
  };

  next();
};
