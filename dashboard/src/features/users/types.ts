import { type UserRole } from "@/configs/appConfig";

export type ManagedUserRole = UserRole | "GUEST";
export type MutableManagedUserRole = Exclude<ManagedUserRole, "SUPER_ADMIN">;
export type TeamUserRole = "MANAGER" | "FRONT_DESK" | "ACCOUNTANT";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: ManagedUserRole;

  createdByUserId?: string | null;
  countryCode: string | null;
  contactNumber: string | null;

  isActive: boolean;
  mustChangePassword: boolean;

  createdAt: string;
  updatedAt: string;
};

export interface UpdateUserPayload {
  fullName?: string;
  isActive?: boolean;
  countryCode?: string;
  contactNumber?: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  countryCode?: string;
  contactNumber?: string;
  role?: TeamUserRole;
}

export interface UpdateUserVariables {
  userId: string;
  payload: UpdateUserPayload;
}

export type AdminUserScope = "admins" | "team";

export type ManagedUsersFilters = {
  search?: string;
  role?: ManagedUserRole | "";
  isActive?: boolean;
  mustChangePassword?: boolean;
};

export type ManagedUserStatusVariables = {
  userId: string;
  isActive: boolean;
};

export type ManagedUserDetailsVariables = {
  userId: string;
  fullName: string;
};

export type ManagedUserRoleVariables = {
  userId: string;
  role: MutableManagedUserRole;
};

export type ManagedUserForcePasswordVariables = {
  userId: string;
  mustChangePassword: boolean;
};

export type AdminSessionStatus = "active" | "expired";
export type AdminSessionAudience = "FRONTEND" | "DASHBOARD";

export type AdminSession = {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  userRole: ManagedUserRole;
  audience: AdminSessionAudience;
  ip: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  isCurrent: boolean;
};

export type AdminSessionsFilters = {
  search?: string;
  userId?: string;
  role?: ManagedUserRole | "";
  status?: AdminSessionStatus | "";
};
