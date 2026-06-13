import { getActor } from "@/modules/users/users.service.js";
import { UserRole } from "@/generated/prisma/enums.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./sessions.repository.js";
import type { SessionListFilters } from "./sessions.inputs.js";
import type { DashboardSessionDTO } from "./sessions.dto.js";

const assertRole = (actor: { role: UserRole }, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const mapSession = (session: repo.SessionRecord, currentRefreshToken?: string): DashboardSessionDTO => {
  const isExpired = session.expiresAt <= new Date();
  const isCurrent = currentRefreshToken !== undefined && session.refreshToken === currentRefreshToken;
  return {
    id: session.id,
    userId: session.userId,
    userFullName: session.user.fullName,
    userEmail: session.user.email,
    userRole: session.user.role,
    audience: session.audience,
    ip: session.ip,
    userAgent: session.userAgent,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    isExpired,
    isCurrent,
  };
};

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
) => {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

export const listSessions = async (
  userId: string,
  filters: SessionListFilters,
  currentRefreshToken?: string,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const { items, total } = await repo.listSessionsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map((session) => mapSession(session, currentRefreshToken)),
  );
};

export const revokeSession = async (
  userId: string,
  sessionId: string,
  currentRefreshToken?: string,
): Promise<void> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const session = await repo.findSessionById(sessionId);
  if (!session) {
    throw new HttpError(404, "SESSION_NOT_FOUND", "Session not found");
  }

  if (
    currentRefreshToken !== undefined &&
    session.refreshToken === currentRefreshToken
  ) {
    throw new HttpError(
      400,
      "CURRENT_SESSION_REVOKE_NOT_ALLOWED",
      "Use logout to end your current session",
    );
  }

  await repo.deleteSessionById(session.id);
};

export const revokeExpiredSessions = async (userId: string): Promise<number> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN]);

  const result = await repo.deleteExpiredSessions();
  return result.count;
};
