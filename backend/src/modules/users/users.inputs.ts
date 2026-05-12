import type { UserRole } from "@/generated/prisma/enums.js";

/**
 * These match Zod output exactly
 **/
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
