import { type UserRole } from "@/configs/appConfig";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * AUTH RESPONSES
 */
export interface RefreshResponse {
  accessToken?: string;
  user?: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}
