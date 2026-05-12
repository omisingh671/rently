import { type UserRole } from "@/configs/appConfig";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;

  createdByUserId?: string | null;
  countryCode: string | null;
  contactNumber: string | null;

  isActive: boolean;

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
}

export interface UpdateUserVariables {
  userId: string;
  payload: UpdateUserPayload;
}

export type AdminUserScope = "admins" | "managers";
