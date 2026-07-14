import type { SessionAudience } from "@/generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        audience?: SessionAudience;
      };
    }
  }
}

export {};
