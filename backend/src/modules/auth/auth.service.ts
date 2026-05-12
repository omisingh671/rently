import crypto from "crypto";
import { env } from "@/config/env.js";
import { Prisma } from "@/generated/prisma/client.js";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/common/utils/jwt.js";

import { verifyPassword, hashPassword } from "@/common/utils/password.js";
import { sendResetPasswordEmail } from "./email/resetPassword.email.js";
import { HttpError } from "@/common/errors/http-error.js";

import * as repo from "./auth.repository.js";

import type {
  LoginUserInput,
  RegisterUserInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "./auth.inputs.js";

import type { AuthResponseDTO } from "./auth.dto.js";

const RESET_TOKEN_TTL_MINUTES = 15;

const createRefreshSession = async (
  userId: string,
  refreshToken: string,
  expiresAt: Date,
  ip?: string,
  userAgent?: string,
) => {
  try {
    await repo.createSession(userId, refreshToken, expiresAt, ip, userAgent);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      await repo.deleteSessionByToken(refreshToken);
      await repo.createSession(userId, refreshToken, expiresAt, ip, userAgent);
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
  ip?: string,
  userAgent?: string,
): Promise<{ auth: AuthResponseDTO; refreshToken: string }> => {
  const user = await repo.findUserByEmail(input.email);
  if (!user)
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok)
    throw new HttpError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password",
    );

  if (!user.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
  });

  const refreshToken = signRefreshToken({ sub: user.id });

  await createRefreshSession(
    user.id,
    refreshToken,
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
      },
      accessToken,
    },
  };
};

/**
 * REGISTER (public)
 **/
export const registerUser = async (input: RegisterUserInput): Promise<void> => {
  const existing = await repo.findUserByEmail(input.email);
  if (existing) {
    throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");
  }

  const passwordHash = await hashPassword(input.password);

  await repo.createUser({
    fullName: input.fullName,
    email: input.email,
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
): Promise<AuthResponseDTO> => {
  const payload = verifyRefreshToken(refreshToken);

  const session = await repo.findSessionByToken(refreshToken);
  if (!session || session.userId !== payload.sub) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid refresh token");
  }

  const user = await repo.findUserById(payload.sub);
  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "User not found");
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    accessToken,
  };
};

/**
 * LOGOUT
 **/
export const logoutUser = async (refreshToken: string) => {
  await repo.deleteSessionByToken(refreshToken);
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

  await repo.deleteSessionsForUser(user.id);
};
