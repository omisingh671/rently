import crypto from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "@/config/env.js";
import { AUTH_TOKEN_TTL_SECONDS } from "@/common/constants/application.constants.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { SessionAudience } from "@/generated/prisma/enums.js";

export interface AccessTokenPayload {
  sub: string;
  role: string;
  audience: SessionAudience;
  sessionId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  audience: SessionAudience;
  sessionId?: string;
}

type RefreshTokenSigningPayload = RefreshTokenPayload & { sessionId: string };

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: AUTH_TOKEN_TTL_SECONDS.access,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      !("role" in decoded) ||
      !("audience" in decoded) ||
      !("sessionId" in decoded)
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid access token");
    }

    const payload = decoded as JwtPayload & AccessTokenPayload;

    return {
      sub: payload.sub,
      role: payload.role,
      audience: payload.audience,
      sessionId: payload.sessionId,
    };
  } catch (err) {
    if (
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.JsonWebTokenError
    ) {
      throw new HttpError(
        401,
        "UNAUTHORIZED",
        "Invalid or expired access token",
      );
    }

    throw err;
  }
}

export function signRefreshToken(payload: RefreshTokenSigningPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: AUTH_TOKEN_TTL_SECONDS.refresh,
    jwtid: crypto.randomUUID(),
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      !("audience" in decoded)
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    const payload = decoded as JwtPayload & RefreshTokenPayload;

    return {
      sub: payload.sub,
      audience: payload.audience,
      ...(typeof payload.sessionId === "string" && {
        sessionId: payload.sessionId,
      }),
    };
  } catch (err) {
    if (
      err instanceof jwt.TokenExpiredError ||
      err instanceof jwt.JsonWebTokenError
    ) {
      throw new HttpError(
        401,
        "UNAUTHORIZED",
        "Invalid or expired refresh token",
      );
    }

    throw err;
  }
}
