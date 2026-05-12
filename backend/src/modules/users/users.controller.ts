import type { Request, Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";

import { HttpError } from "@/common/errors/http-error.js";
import { UserRole } from "@/generated/prisma/enums.js";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
} from "./users.schema.js";

/**
 * Admin controllers
 * (authorization enforced via middleware / service, not controller typing)
 **/
export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const search =
    typeof req.query.search === "string" ? req.query.search : undefined;

  const role =
    typeof req.query.role === "string" &&
    Object.values(UserRole).includes(req.query.role as UserRole)
      ? (req.query.role as UserRole)
      : undefined;

  const isActive =
    req.query.isActive === "true"
      ? true
      : req.query.isActive === "false"
        ? false
        : undefined;

  const result = await service.listUsers({
    page,
    limit,
    ...(search !== undefined && { search }),
    ...(role !== undefined && { role }),
    ...(isActive !== undefined && { isActive }),
  });

  res.json({ success: true, data: result });
};

export const create = async (req: Request, res: Response) => {
  const body = createUserSchema.parse(req.body);
  const user = await service.createUser(body);

  res.status(201).json({ success: true, data: user });
};

export const update = async (req: Request<IdParams>, res: Response) => {
  const body = updateUserSchema.parse(req.body);
  const user = await service.updateUser(req.params.id, body);

  res.json({ success: true, data: user });
};

export const remove = async (req: Request<IdParams>, res: Response) => {
  await service.deleteUser(req.params.id);
  res.status(204).send();
};

/**
 * Self profile (auth-context dependent)
 */
export const getMe = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    // should never happen if authenticate middleware is correct
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const profile = await service.getMyProfile(userId);
  res.json({ success: true, data: profile });
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const body = updateProfileSchema.parse(req.body);
  const profile = await service.updateMyProfile(userId, body);

  res.json({ success: true, data: profile });
};
