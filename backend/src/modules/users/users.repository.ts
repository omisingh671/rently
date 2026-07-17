import { prisma } from "@/db/prisma.js";
import { UserRole, PropertyAssignmentRole } from "@/generated/prisma/enums.js";


export interface UserListFilters {
  roles?: UserRole[];
  search?: string;
  isActive?: boolean;
  mustChangePassword?: boolean;
  createdByUserId?: string;
}

const buildUserWhere = (filters: UserListFilters) => {
  return {
    ...(filters.roles !== undefined && { role: { in: filters.roles } }),
    ...(filters.search !== undefined && {
      OR: [
        { fullName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
    ...(filters.mustChangePassword !== undefined && {
      mustChangePassword: filters.mustChangePassword,
    }),
    ...(filters.createdByUserId !== undefined && {
      createdByUserId: filters.createdByUserId,
    }),
  };
};

export const listUsers = () =>
  prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

export const listUsersPaginated = async (
  page: number,
  limit: number,
  filters: UserListFilters,
) => {
  const skip = (page - 1) * limit;
  const where = buildUserWhere(filters);

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
};

export const createUser = (data: {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdBy?: { connect: { id: string } };
  countryCode?: string;
  contactNumber?: string;
}) => prisma.user.create({ data });

export const updateUserById = (
  id: string,
  data: Partial<{
    fullName: string;
    role: UserRole;
    countryCode: string;
    contactNumber: string;
    isActive: boolean;
    mustChangePassword: boolean;
  }>,
) =>
  prisma.user.update({
    where: { id },
    data,
  });

export const updateUserRoleAndAssignments = (
  userId: string,
  role: Exclude<UserRole, "SUPER_ADMIN">,
) =>
  prisma.$transaction(async (tx) => {
    await tx.propertyAssignment.deleteMany({
      where: {
        userId,
        ...(role !== UserRole.GUEST
          ? { role: { not: role as PropertyAssignmentRole } }
          : {}),
      },
    });

    if (role === UserRole.GUEST) {
      await tx.propertyAssignment.deleteMany({
        where: { userId },
      });
    }

    return tx.user.update({
      where: { id: userId },
      data: { role },
    });
  });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({
    where: { email },
  });

export const countUsersByRole = (role: UserRole, createdByUserId?: string) =>
  prisma.user.count({
    where: {
      role,
      ...(createdByUserId !== undefined && { createdByUserId }),
    },
  });

export const deleteSessionsForUser = (userId: string) =>
  prisma.session.deleteMany({
    where: { userId },
  });

export const deleteSessionsForUserExcept = (
  userId: string,
  currentRefreshToken: string,
) =>
  prisma.session.deleteMany({
    where: {
      userId,
      refreshToken: { not: currentRefreshToken },
    },
  });

export const deletePasswordResetTokensForUser = (userId: string) =>
  prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

export const createPasswordResetToken = (data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) =>
  prisma.passwordResetToken.create({
    data,
  });


