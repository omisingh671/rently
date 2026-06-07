import { prisma } from "@/db/prisma.js";
import { getActor } from "@/modules/users/users.service.js";
import { findUserById } from "@/modules/users/users.repository.js";
import { UserRole, PropertyAssignmentRole } from "@/generated/prisma/enums.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./property-assignments.repository.js";
import type { AssignmentListFilters, CreateDashboardAssignmentInput } from "./property-assignments.inputs.js";
import type { DashboardPropertyAssignmentDTO } from "./property-assignments.dto.js";
import type { UserEntity } from "@/modules/users/users.dto.js";

const assertRole = (actor: { role: UserRole }, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

const ensurePropertyExists = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  return property;
};

export const getPropertyScope = async (actor: UserEntity) => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return {
      isGlobal: true,
      propertyIds: [] as string[],
    };
  }

  if (actor.role === UserRole.ADMIN) {
    return {
      isGlobal: false,
      propertyIds: await repo.listAssignedPropertyIds(
        actor.id,
        PropertyAssignmentRole.ADMIN,
      ),
    };
  }

  if (actor.role === UserRole.MANAGER) {
    return {
      isGlobal: false,
      propertyIds: await repo.listAssignedPropertyIds(
        actor.id,
        PropertyAssignmentRole.MANAGER,
      ),
    };
  }

  return {
    isGlobal: false,
    propertyIds: [] as string[],
  };
};

const assertPropertyInScope = async (
  actor: UserEntity,
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

const mapAssignment = (assignment: repo.PropertyAssignmentRecord): DashboardPropertyAssignmentDTO => ({
  id: assignment.id,
  propertyId: assignment.propertyId,
  propertyName: assignment.property.name,
  userId: assignment.userId,
  userName: assignment.user.fullName,
  userEmail: assignment.user.email,
  role: assignment.role,
  assignedByUserId: assignment.assignedByUserId,
  assignedByName: assignment.assignedBy.fullName,
  createdAt: assignment.createdAt,
});

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

export const listPropertyAssignments = async (
  userId: string,
  filters: AssignmentListFilters,
) => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  if (actor.role === UserRole.ADMIN && filters.role === PropertyAssignmentRole.ADMIN) {
    throw new HttpError(403, "FORBIDDEN", "Admins cannot view admin assignments");
  }

  const scope = await getPropertyScope(actor);
  const propertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (propertyIds !== undefined && propertyIds.length === 0) {
    return normalizePaginationResult(filters.page, filters.limit, 0, []);
  }

  const { items, total } = await repo.listPropertyAssignmentsPaginated({
    ...filters,
    ...(actor.role === UserRole.ADMIN && {
      role: PropertyAssignmentRole.MANAGER,
    }),
    ...(propertyIds !== undefined && { propertyIds }),
  });

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items
      .filter((assignment) =>
        actor.role === UserRole.ADMIN
          ? assignment.user.createdByUserId === actor.id
          : true,
      )
      .map(mapAssignment),
  );
};

export const createPropertyAssignment = async (
  userId: string,
  input: CreateDashboardAssignmentInput,
): Promise<DashboardPropertyAssignmentDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const property = await ensurePropertyExists(input.propertyId);
  const targetUser = await findUserById(input.userId);

  if (!targetUser || !targetUser.isActive) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  const existingAssignment = await repo.findPropertyAssignmentByPropertyAndUser(
    input.propertyId,
    input.userId,
  );

  if (existingAssignment) {
    throw new HttpError(
      409,
      "ASSIGNMENT_EXISTS",
      "This user is already assigned to the property",
    );
  }

  if (input.role === PropertyAssignmentRole.ADMIN) {
    assertRole(actor, [UserRole.SUPER_ADMIN]);

    if (targetUser.role !== UserRole.ADMIN) {
      throw new HttpError(
        400,
        "INVALID_ASSIGNMENT",
        "Only admin users can receive admin property assignments",
      );
    }

    const existingAdminAssignment =
      await repo.findPropertyAssignmentByPropertyAndRole(
        property.id,
        PropertyAssignmentRole.ADMIN,
      );

    if (existingAdminAssignment) {
      throw new HttpError(
        409,
        "PROPERTY_ADMIN_EXISTS",
        "Property already has an assigned admin",
      );
    }
  }

  if (input.role === PropertyAssignmentRole.MANAGER) {
    if (targetUser.role !== UserRole.MANAGER) {
      throw new HttpError(
        400,
        "INVALID_ASSIGNMENT",
        "Only manager users can receive manager property assignments",
      );
    }

    const adminAssignment = await repo.findPropertyAssignmentByPropertyAndRole(
      property.id,
      PropertyAssignmentRole.ADMIN,
    );

    if (!adminAssignment) {
      throw new HttpError(
        400,
        "PROPERTY_ADMIN_REQUIRED",
        "Assign an admin to the property before assigning managers",
      );
    }

    if (actor.role === UserRole.ADMIN) {
      if (adminAssignment.userId !== actor.id) {
        throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
      }

      if (targetUser.createdByUserId !== actor.id) {
        throw new HttpError(
          400,
          "INVALID_ASSIGNMENT",
          "Admins can only assign managers they created",
        );
      }
    }

    if (actor.role === UserRole.SUPER_ADMIN) {
      if (targetUser.createdByUserId !== adminAssignment.userId) {
        throw new HttpError(
          400,
          "INVALID_ASSIGNMENT",
          "Manager must belong to the admin assigned to the property",
        );
      }
    }
  }

  const assignment = await repo.createPropertyAssignment({
    role: input.role,
    property: {
      connect: {
        id: input.propertyId,
      },
    },
    user: {
      connect: {
        id: input.userId,
      },
    },
    assignedBy: {
      connect: {
        id: actor.id,
      },
    },
  });

  return mapAssignment(assignment);
};

export const deletePropertyAssignment = async (
  userId: string,
  assignmentId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);

  const assignment = await repo.findPropertyAssignmentById(assignmentId);
  if (!assignment) {
    throw new HttpError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
  }

  if (actor.role === UserRole.ADMIN) {
    if (assignment.role !== PropertyAssignmentRole.MANAGER) {
      throw new HttpError(403, "FORBIDDEN", "Access denied");
    }

    await assertPropertyInScope(actor, assignment.propertyId);

    if (assignment.user.createdByUserId !== actor.id) {
      throw new HttpError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }
  }

  await repo.deletePropertyAssignmentById(assignment.id);
};
