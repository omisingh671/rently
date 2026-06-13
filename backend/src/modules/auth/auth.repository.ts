import { prisma } from "@/db/prisma.js";
import type { SessionAudience } from "@/generated/prisma/enums.js";

/**
 * Users
 */
export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const createUser = (data: {
  fullName: string;
  email: string;
  passwordHash: string;
  role: "GUEST";
  countryCode?: string;
  contactNumber?: string;
}) =>
  prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      ...(data.countryCode !== undefined &&
        data.contactNumber !== undefined && {
          countryCode: data.countryCode,
          contactNumber: data.contactNumber,
        }),
    },
  });

/**
 * Sessions
 */
export const createSession = (
  userId: string,
  refreshToken: string,
  audience: SessionAudience,
  expiresAt: Date,
  ip?: string,
  userAgent?: string,
) =>
  prisma.session.create({
    data: {
      userId,
      refreshToken,
      audience,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

export const findSessionByToken = (
  refreshToken: string,
  audience: SessionAudience,
) =>
  prisma.session.findFirst({ where: { refreshToken, audience } });

export const deleteSessionByToken = (refreshToken: string) =>
  prisma.session.deleteMany({
    where: { refreshToken },
  });

export const deleteSessionsForUser = (userId: string) =>
  prisma.session.deleteMany({ where: { userId } });

export const deleteOtherSessionsForUser = (
  userId: string,
  currentRefreshToken: string,
) =>
  prisma.session.deleteMany({
    where: {
      userId,
      refreshToken: { not: currentRefreshToken },
    },
  });

export const rotateSessionToken = (
  currentRefreshToken: string,
  audience: SessionAudience,
  nextRefreshToken: string,
  expiresAt: Date,
  ip?: string,
  userAgent?: string,
) =>
  prisma.session.updateMany({
    where: { refreshToken: currentRefreshToken, audience },
    data: {
      refreshToken: nextRefreshToken,
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

/**
 * Password reset
 */
export const createPasswordResetToken = (data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) =>
  prisma.passwordResetToken.create({
    data,
  });

export const findPasswordResetTokenByHash = (tokenHash: string) =>
  prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

export const deletePasswordResetTokensForUser = (userId: string) =>
  prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

export const updateUserPassword = (userId: string, passwordHash: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
