import crypto from "crypto";
import { env } from "@/config/env.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { SessionAudience } from "@/generated/prisma/enums.js";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/common/utils/jwt.js";

import { verifyPassword, hashPassword } from "@/common/utils/password.js";
import { sendResetPasswordEmail } from "./email/resetPassword.email.js";
import { HttpError } from "@/common/errors/http-error.js";

import * as repo from "./auth.repository.js";
import { assertRoleAllowedForAudience } from "./auth-client.js";

import type {
  LoginUserInput,
  RegisterUserInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "./auth.inputs.js";

import type { AuthResponseDTO } from "./auth.dto.js";

const RESET_TOKEN_TTL_MINUTES = 15;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

const failedLoginAttempts = new Map<
  string,
  { count: number; lockedUntil?: number }
>();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const assertLoginNotLocked = (email: string) => {
  const attempt = failedLoginAttempts.get(email);
  if (!attempt?.lockedUntil) {
    return;
  }

  if (attempt.lockedUntil > Date.now()) {
    throw new HttpError(
      429,
      "LOGIN_LOCKED",
      "Too many failed login attempts. Please try again later.",
    );
  }

  failedLoginAttempts.delete(email);
};

const recordFailedLogin = (email: string) => {
  const current = failedLoginAttempts.get(email);
  const count = (current?.count ?? 0) + 1;
  failedLoginAttempts.set(email, {
    count,
    ...(count >= MAX_FAILED_LOGIN_ATTEMPTS && {
      lockedUntil: Date.now() + LOGIN_LOCK_MS,
    }),
  });
};

const clearFailedLogin = (email: string) => {
  failedLoginAttempts.delete(email);
};

const createRefreshSession = async (
  userId: string,
  refreshToken: string,
  audience: SessionAudience,
  expiresAt: Date,
  ip?: string,
  userAgent?: string,
) => {
  try {
    await repo.createSession(
      userId,
      refreshToken,
      audience,
      expiresAt,
      ip,
      userAgent,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await repo.deleteSessionByToken(refreshToken);
      await repo.createSession(
        userId,
        refreshToken,
        audience,
        expiresAt,
        ip,
        userAgent,
      );
      return;
    }

    throw error;
  }
};

/**
 * LOGIN
 **/
export const loginUser = async (
  input: LoginUserInput,
  audience: SessionAudience,
  ip?: string,
  userAgent?: string,
): Promise<{ auth: AuthResponseDTO; refreshToken: string }> => {
  const email = normalizeEmail(input.email);
  assertLoginNotLocked(email);

  const user = await repo.findUserByEmail(email);
  if (!user) {
    recordFailedLogin(email);
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    recordFailedLogin(email);
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );
  }

  if (!user.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }

  clearFailedLogin(email);
  assertRoleAllowedForAudience(user.role, audience);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    audience,
  });

  const refreshToken = signRefreshToken({ sub: user.id, audience });

  await createRefreshSession(
    user.id,
    refreshToken,
    audience,
    new Date(Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000),
    ip,
    userAgent,
  );

  return {
    refreshToken,
    auth: {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      accessToken,
    },
  };
};

/**
 * REGISTER (public)
 **/
export const registerUser = async (input: RegisterUserInput): Promise<void> => {
  const email = normalizeEmail(input.email);
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  await repo.createUser({
    fullName: input.fullName,
    email,
    passwordHash,
    role: "GUEST",
    ...(input.countryCode !== undefined &&
      input.contactNumber !== undefined && {
        countryCode: input.countryCode,
        contactNumber: input.contactNumber,
      }),
  });
};

/**
 * REFRESH
 **/
export const refreshSession = async (
  refreshToken: string,
  audience: SessionAudience,
  ip?: string,
  userAgent?: string,
): Promise<{ auth: AuthResponseDTO; refreshToken: string }> => {
  const payload = verifyRefreshToken(refreshToken);
  if (payload.audience !== audience) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid refresh token audience");
  }

  const session = await repo.findSessionByToken(refreshToken, audience);
  if (!session || session.userId !== payload.sub) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  if (session.expiresAt <= new Date()) {
    await repo.deleteSessionByToken(refreshToken);
    throw new HttpError(401, "UNAUTHORIZED", "Refresh token expired");
  }

  const user = await repo.findUserById(payload.sub);
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "User not found");
  }

  if (!user.isActive) {
    await repo.deleteSessionsForUser(user.id);
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }
  assertRoleAllowedForAudience(user.role, audience);

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    audience,
  });
  const nextRefreshToken = signRefreshToken({ sub: user.id, audience });
  const nextRefreshExpiresAt = new Date(
    Date.now() + env.JWT_REFRESH_EXPIRES_IN * 1000,
  );

  try {
    await repo.rotateSessionToken(
      refreshToken,
      audience,
      nextRefreshToken,
      nextRefreshExpiresAt,
      ip,
      userAgent,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await repo.deleteSessionByToken(nextRefreshToken);
      await repo.rotateSessionToken(
        refreshToken,
        audience,
        nextRefreshToken,
        nextRefreshExpiresAt,
        ip,
        userAgent,
      );
    } else {
      throw error;
    }
  }

  return {
    refreshToken: nextRefreshToken,
    auth: {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      accessToken,
    },
  };
};

/**
 * LOGOUT
 **/
export const logoutUser = async (refreshToken: string) => {
  await repo.deleteSessionByToken(refreshToken);
};

export const revokeUserSessions = async (userId: string) => {
  await repo.deleteSessionsForUser(userId);
};

/**
 * ME
 **/
export const getCurrentUser = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
};

/**
 * FORGOT PASSWORD
 **/
export const forgotPassword = async (
  input: ForgotPasswordInput,
): Promise<void> => {
  const user = await repo.findUserByEmail(input.email);
  if (!user) return;

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await repo.createPasswordResetToken({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
  });

  await sendResetPasswordEmail(user.email, rawToken);
};

/**
 * RESET PASSWORD
 **/
export const resetPassword = async (
  input: ResetPasswordInput,
): Promise<void> => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(input.token)
    .digest("hex");

  const record = await repo.findPasswordResetTokenByHash(tokenHash);
  if (!record) {
    throw new HttpError(
      400,
      "INVALID_OR_EXPIRED_TOKEN",
      "Reset token is invalid or expired",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await repo.updateUserPassword(record.userId, passwordHash);
  await repo.deletePasswordResetTokensForUser(record.userId);
  await repo.deleteSessionsForUser(record.userId);
};

export const changePassword = async (
  input: ChangePasswordInput,
  currentRefreshToken?: string,
): Promise<void> => {
  const user = await repo.findUserById(input.userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) {
    throw new HttpError(
      400,
      "INVALID_PASSWORD",
      "Current password is incorrect",
    );
  }

  const newHash = await hashPassword(input.newPassword);

  await repo.updateUserPassword(user.id, newHash);

  if (currentRefreshToken !== undefined) {
    await repo.deleteOtherSessionsForUser(user.id, currentRefreshToken);
    return;
  }

  await repo.deleteSessionsForUser(user.id);
};
