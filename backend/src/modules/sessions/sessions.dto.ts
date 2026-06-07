import type { UserRole } from "@/generated/prisma/enums.js";

export interface DashboardSessionDTO {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userRole: UserRole;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  isCurrent: boolean;
}
