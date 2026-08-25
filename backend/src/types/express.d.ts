import type { SessionAudience } from "@/generated/prisma/enums.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
        sessionId: string;
        audience?: SessionAudience;
      };
    }
  }
}

export {};
