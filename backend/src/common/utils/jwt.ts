import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";

export interface AccessTokenPayload {
  sub: string;
  role: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      !("role" in decoded)
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid access token");
    }

    const payload = decoded as JwtPayload & AccessTokenPayload;

    return {
      sub: payload.sub,
      role: payload.role,
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

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded)
    ) {
      throw new HttpError(401, "UNAUTHORIZED", "Invalid refresh token");
    }

    const payload = decoded as JwtPayload & RefreshTokenPayload;

    return { sub: payload.sub };
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
