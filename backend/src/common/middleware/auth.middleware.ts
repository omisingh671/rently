import type { Request, RequestHandler } from "express";
import { verifyAccessToken } from "@/common/utils/jwt.js";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "../errors/http-error.js";
import {
  assertRoleAllowedForAudience,
  parseAppClient,
} from "@/modules/auth/auth-client.js";
import type { SessionAudience } from "@/generated/prisma/enums.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    audience?: SessionAudience;
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
  const audience = parseAppClient(req.headers["x-app-client"]);
  if (payload.audience !== audience) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid access token audience");
  }
  const user = await getCurrentAuthUser(payload.sub);
  assertRoleAllowedForAudience(user.role, audience);

  (req as AuthRequest).user = {
    userId: user.id,
    role: user.role,
    audience,
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
  const audience = parseAppClient(req.headers["x-app-client"]);
  if (payload.audience !== audience) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid access token audience");
  }
  const user = await getCurrentAuthUser(payload.sub);
  assertRoleAllowedForAudience(user.role, audience);

  (req as AuthRequest).user = {
    userId: user.id,
    role: user.role,
    audience,
  };

  next();
};
