import type { UserRole } from "@/generated/prisma/enums.js";

export interface SessionListFilters {
  page: number;
  limit: number;
  search?: string;
  userId?: string;
  role?: UserRole;
  status?: "active" | "expired";
}
