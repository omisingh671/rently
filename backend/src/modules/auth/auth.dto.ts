import type { UserRole } from "@/generated/prisma/client.js";

export interface AuthUserDTO {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponseDTO {
  user: AuthUserDTO;
  accessToken: string;
}
