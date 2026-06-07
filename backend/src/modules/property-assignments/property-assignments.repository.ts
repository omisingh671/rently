import { prisma } from "@/db/prisma.js";
import { Prisma } from "@/generated/prisma/client.js";
import type { PropertyAssignmentRole } from "@/generated/prisma/enums.js";
import type { AssignmentListFilters } from "./property-assignments.inputs.js";

const dashboardAssignmentInclude = {
  property: true,
  user: true,
  assignedBy: true,
} satisfies Prisma.PropertyAssignmentInclude;

export type PropertyAssignmentRecord = Prisma.PropertyAssignmentGetPayload<{
  include: typeof dashboardAssignmentInclude;
}>;


const buildAssignmentWhere = (
  filters: Omit<AssignmentListFilters, "page" | "limit">,
) => {
  return {
    ...(filters.propertyIds !== undefined && {
      propertyId: { in: filters.propertyIds },
    }),
    ...(filters.propertyId !== undefined && { propertyId: filters.propertyId }),
    ...(filters.role !== undefined && { role: filters.role }),
    ...(filters.userId !== undefined && { userId: filters.userId }),
  } satisfies Prisma.PropertyAssignmentWhereInput;
};

export const listPropertyAssignmentsPaginated = async (
  filters: AssignmentListFilters,
) => {
  const where = buildAssignmentWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.propertyAssignment.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardAssignmentInclude,
    }),
    prisma.propertyAssignment.count({ where }),
  ]);

  return { items, total };
};

export const findPropertyAssignmentById = (id: string) =>
  prisma.propertyAssignment.findUnique({
    where: { id },
    include: dashboardAssignmentInclude,
  });

export const findPropertyAssignmentByPropertyAndUser = (
  propertyId: string,
  userId: string,
) =>
  prisma.propertyAssignment.findUnique({
    where: {
      propertyId_userId: {
        propertyId,
        userId,
      },
    },
    include: dashboardAssignmentInclude,
  });

export const findPropertyAssignmentByPropertyAndRole = (
  propertyId: string,
  role: PropertyAssignmentRole,
) =>
  prisma.propertyAssignment.findFirst({
    where: {
      propertyId,
      role,
    },
    include: dashboardAssignmentInclude,
  });

export const createPropertyAssignment = (data: Prisma.PropertyAssignmentCreateInput) =>
  prisma.propertyAssignment.create({
    data,
    include: dashboardAssignmentInclude,
  });

export const deletePropertyAssignmentById = (id: string) =>
  prisma.propertyAssignment.delete({
    where: { id },
  });

export const countAssignments = (
  propertyIds?: string[],
  role?: PropertyAssignmentRole,
) =>
  prisma.propertyAssignment.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(role !== undefined && { role }),
    },
  });

export const listAssignedPropertyIds = async (
  userId: string,
  role?: PropertyAssignmentRole,
) => {
  const assignments = await prisma.propertyAssignment.findMany({
    where: {
      userId,
      ...(role !== undefined && { role }),
    },
    select: {
      propertyId: true,
    },
  });

  return assignments.map((assignment) => assignment.propertyId);
};
