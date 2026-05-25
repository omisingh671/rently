import type { UserRole } from "@/generated/prisma/client.js";

export interface AuthUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface AuthResponseDTO {
  user: AuthUserDTO;
  accessToken: string;
}
