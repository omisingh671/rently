import type { Response, NextFunction } from "express";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "./auth.middleware.js";

export const requirePasswordChangeComplete = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true },
  });

  if (!user) {
    throw new HttpError(401, "UNAUTHORIZED", "User not found");
  }

  if (user.mustChangePassword) {
    throw new HttpError(
      403,
      "PASSWORD_CHANGE_REQUIRED",
      "Password change is required before continuing",
    );
  }

  next();
};
