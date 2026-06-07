import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { SessionListFilters } from "./sessions.inputs.js";

const dashboardSessionInclude = {
  user: true,
} satisfies Prisma.SessionInclude;

export type SessionRecord = Prisma.SessionGetPayload<{
  include: typeof dashboardSessionInclude;
}>;


const buildSessionWhere = (
  filters: Omit<SessionListFilters, "page" | "limit">,
) => {
  const now = new Date();

  return {
    ...(filters.userId !== undefined && { userId: filters.userId }),
    ...(filters.status === "active" && { expiresAt: { gt: now } }),
    ...(filters.status === "expired" && { expiresAt: { lte: now } }),
    ...((filters.search !== undefined || filters.role !== undefined) && {
      user: {
        is: {
          ...(filters.role !== undefined && { role: filters.role }),
          ...(filters.search !== undefined && {
            OR: [
              { fullName: { contains: filters.search } },
              { email: { contains: filters.search } },
            ],
          }),
        },
      },
    }),
  } satisfies Prisma.SessionWhereInput;
};

export const listSessionsPaginated = async (filters: SessionListFilters) => {
  const where = buildSessionWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.session.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardSessionInclude,
    }),
    prisma.session.count({ where }),
  ]);

  return { items, total };
};

export const findSessionById = (id: string) =>
  prisma.session.findUnique({
    where: { id },
    include: dashboardSessionInclude,
  });

export const deleteSessionById = (id: string) =>
  prisma.session.deleteMany({
    where: { id },
  });

export const deleteExpiredSessions = () =>
  prisma.session.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
    },
  });
