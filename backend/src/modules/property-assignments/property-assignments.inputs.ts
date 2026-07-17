import type { PropertyAssignmentRole } from "@/generated/prisma/enums.js";

export interface AssignmentListFilters {
  page: number;
  limit: number;
  propertyIds?: string[];
  propertyId?: string;
  role?: PropertyAssignmentRole;
  roles?: PropertyAssignmentRole[];
  userId?: string;
}

export interface CreateDashboardAssignmentInput {
  propertyId: string;
  userId: string;
  role: PropertyAssignmentRole;
}
