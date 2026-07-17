import type { UserRole } from "@/generated/prisma/enums.js";

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  countryCode?: string | undefined;
  contactNumber?: string | undefined;
}

export interface UpdateUserInput {
  fullName?: string | undefined;
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
  countryCode?: string | undefined;
  contactNumber?: string | undefined;
}

export interface CreateDashboardUserInput {
  fullName: string;
  email: string;
  password: string;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateDashboardStaffInput extends CreateDashboardUserInput {
  role: "FRONT_DESK" | "ACCOUNTANT";
}

export interface UpdateDashboardUserInput {
  fullName?: string;
  isActive?: boolean;
  countryCode?: string;
  contactNumber?: string;
}

export interface UpdateDashboardUserStatusInput {
  isActive: boolean;
}

export interface UpdateDashboardUserRoleInput {
  role: "ADMIN" | "MANAGER" | "FRONT_DESK" | "ACCOUNTANT" | "GUEST";
}

export interface UpdateDashboardForcePasswordChangeInput {
  mustChangePassword: boolean;
}
