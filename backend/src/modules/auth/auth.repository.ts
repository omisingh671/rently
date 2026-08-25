import { prisma } from "@/db/prisma.js";
import type { SessionAudience } from "@/generated/prisma/enums.js";
import { hashRefreshToken } from "./refresh-token.js";

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
  id: string,
  userId: string,
  refreshToken: string,
  audience: SessionAudience,
  expiresAt: Date,
  ip?: string,
  userAgent?: string,
) =>
  prisma.session.create({
    data: {
      id,
      userId,
      refreshToken: hashRefreshToken(refreshToken),
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
  prisma.session.findFirst({
    where: {
      audience,
      refreshToken: { in: [refreshToken, hashRefreshToken(refreshToken)] },
    },
  });

export const deleteSessionByToken = (refreshToken: string) =>
  prisma.session.deleteMany({
    where: {
      refreshToken: { in: [refreshToken, hashRefreshToken(refreshToken)] },
    },
  });

export const deleteSessionByIdentity = (
  id: string,
  userId: string,
  audience: SessionAudience,
) => prisma.session.deleteMany({ where: { id, userId, audience } });

export const deleteSessionsForUser = (userId: string) =>
  prisma.session.deleteMany({ where: { userId } });

export const deleteOtherSessionsForUser = (
  userId: string,
  currentRefreshToken: string,
) =>
  prisma.session.deleteMany({
    where: {
      userId,
      refreshToken: {
        notIn: [currentRefreshToken, hashRefreshToken(currentRefreshToken)],
      },
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
    where: {
      audience,
      refreshToken: {
        in: [currentRefreshToken, hashRefreshToken(currentRefreshToken)],
      },
    },
    data: {
      refreshToken: hashRefreshToken(nextRefreshToken),
      expiresAt,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  });

/**
 * Password reset
 */
export const findPasswordResetTokenByHash = (tokenHash: string) =>
  prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

export const updateUserPassword = (userId: string, passwordHash: string) =>
  prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

export const consumePasswordResetToken = async (
  tokenHash: string,
  passwordHash: string,
) => {
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
  });
  if (!record) return false;

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          id: record.id,
          tokenHash,
          expiresAt: { gt: new Date() },
        },
      });
    if (consumed.count !== 1) return false;

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    });
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    return true;
  });
};
