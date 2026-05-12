import { prisma } from "@/db/prisma.js";
import { UserRole } from "@/generated/prisma/enums.js";

type ListUsersFilters = {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
};

export const listUsers = () =>
  prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

/**
 * Admin — paginated users
 **/
export const listUsersPaginated = async (
  page: number,
  limit: number,
  filters: ListUsersFilters,
) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(filters.search && {
      OR: [
        { fullName: { contains: filters.search } },
        { email: { contains: filters.search } },
      ],
    }),
    ...(filters.role && { role: filters.role }),
    ...(filters.isActive !== undefined && { isActive: filters.isActive }),
  };

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
  }>,
) =>
  prisma.user.update({
    where: { id },
    data,
  });

export const findUserById = (id: string) =>
  prisma.user.findUnique({ where: { id } });
