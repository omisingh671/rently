import { type UserRole } from "@/configs/appConfig";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  countryCode: string | null;
  contactNumber: string | null;
  role: UserRole;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
