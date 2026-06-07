import type { PropertyAssignmentRole } from "@/generated/prisma/enums.js";

export interface DashboardPropertyAssignmentDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: PropertyAssignmentRole;
  assignedByUserId: string;
  assignedByName: string;
  createdAt: Date;
}
