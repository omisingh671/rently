import type { Request, Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import { UserRole } from "@/generated/prisma/enums.js";
import type { IdParams } from "@/common/types/params.js";
import { getRefreshCookieName } from "@/modules/auth/auth-client.js";

import * as service from "./users.service.js";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  createDashboardUserSchema,
  updateDashboardUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  updateForcePasswordChangeSchema,
  listUsersQuerySchema,
  listAllUsersQuerySchema,
  idParamsSchema,
} from "./users.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

/**
 * Public/General users controller handlers
 */
export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const role =
    typeof req.query.role === "string" && Object.values(UserRole).includes(req.query.role as UserRole)
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

export const getMe = async (req: AuthRequest, res: Response) => {
  const profile = await service.getMyProfile(getUserId(req));
  res.json({ success: true, data: profile });
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  const body = updateProfileSchema.parse(req.body);
  const profile = await service.updateMyProfile(getUserId(req), body);
  res.json({ success: true, data: profile });
};

/**
 * Dashboard Admin Handlers
 */
export const listAdmins = async (req: AuthRequest, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await service.listAdmins(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createAdmin = async (req: AuthRequest, res: Response) => {
  const body = createDashboardUserSchema.parse(req.body);
  const data = await service.createAdmin(getUserId(req), {
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && { contactNumber: body.contactNumber }),
  });
  res.status(201).json({ success: true, data });
};

export const updateAdmin = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateDashboardUserSchema.parse(req.body);
  const data = await service.updateAdmin(getUserId(req), params.id, {
    ...(body.fullName !== undefined && { fullName: body.fullName }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && { contactNumber: body.contactNumber }),
  });
  res.json({ success: true, data });
};

/**
 * Dashboard Manager Handlers
 */
export const listManagers = async (req: AuthRequest, res: Response) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await service.listManagers(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createManager = async (req: AuthRequest, res: Response) => {
  const body = createDashboardUserSchema.parse(req.body);
  const data = await service.createManager(getUserId(req), {
    fullName: body.fullName,
    email: body.email,
    password: body.password,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && { contactNumber: body.contactNumber }),
  });
  res.status(201).json({ success: true, data });
};

export const updateManager = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateDashboardUserSchema.parse(req.body);
  const data = await service.updateManager(getUserId(req), params.id, {
    ...(body.fullName !== undefined && { fullName: body.fullName }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && { contactNumber: body.contactNumber }),
  });
  res.json({ success: true, data });
};

/**
 * Dashboard Operator Management Handlers
 */
export const listUsersForDashboard = async (req: AuthRequest, res: Response) => {
  const query = listAllUsersQuerySchema.parse(req.query);
  const data = await service.listUsersForDashboard(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.role !== undefined && { role: query.role }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
    ...(query.mustChangePassword !== undefined && {
      mustChangePassword: query.mustChangePassword,
    }),
  });
  res.json({ success: true, data });
};

export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateUserStatusSchema.parse(req.body);
  const data = await service.updateUserStatus(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateUserRoleSchema.parse(req.body);
  const data = await service.updateUserRole(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const sendUserPasswordResetEmail = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.sendUserPasswordResetEmail(getUserId(req), params.id);
  res.status(204).send();
};

export const updateForcePasswordChange = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateForcePasswordChangeSchema.parse(req.body);
  const data = await service.updateForcePasswordChange(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const revokeUserSessions = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const audience = req.user?.audience;
  await service.revokeUserSessions(
    getUserId(req),
    params.id,
    audience
      ? req.cookies?.[getRefreshCookieName(audience)]
      : undefined,
  );
  res.status(204).send();
};
