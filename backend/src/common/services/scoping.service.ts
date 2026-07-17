import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  type User,
  UserRole,
  PropertyAssignmentRole,
} from "@/generated/prisma/client.js";

export type DashboardActor = User;

export interface DashboardPropertyScope {
  isGlobal: boolean;
  propertyIds: string[];
}

const INVENTORY_ROLES = new Set<UserRole>([
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
]);

export const ensureActiveActor = (actor: DashboardActor) => {
  if (!actor.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }
};

export const getActor = async (userId: string): Promise<DashboardActor> => {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!actor) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  ensureActiveActor(actor);
  return actor;
};

export const getPropertyScope = async (
  actor: DashboardActor,
): Promise<DashboardPropertyScope> => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return {
      isGlobal: true,
      propertyIds: [],
    };
  }

  const role =
    actor.role === UserRole.ADMIN
      ? PropertyAssignmentRole.ADMIN
      : actor.role === UserRole.MANAGER
        ? PropertyAssignmentRole.MANAGER
        : undefined;

  if (!role) {
    return {
      isGlobal: false,
      propertyIds: [],
    };
  }

  const assignments = await prisma.propertyAssignment.findMany({
    where: {
      userId: actor.id,
      role,
    },
    select: {
      propertyId: true,
    },
  });

  return {
    isGlobal: false,
    propertyIds: assignments.map((a) => a.propertyId),
  };
};

export const assertPropertyInScope = async (
  actor: DashboardActor,
  propertyId: string,
): Promise<void> => {
  const scope = await getPropertyScope(actor);
  if (scope.isGlobal) {
    return;
  }

  if (!scope.propertyIds.includes(propertyId)) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
};

export const assertCanManageInventory = async (
  actor: DashboardActor,
  propertyId: string,
) => {
  if (!INVENTORY_ROLES.has(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }

  await assertPropertyInScope(actor, propertyId);
};

export const ensurePropertyExists = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { tenant: true },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  return property;
};
