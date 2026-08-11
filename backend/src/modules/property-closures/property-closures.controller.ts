import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./property-closures.service.js";
import {
  cancelPropertyClosureSchema,
  closureIdParamsSchema,
  createPropertyClosureSchema,
  listPropertyClosuresQuerySchema,
  propertyIdParamsSchema,
} from "./property-closures.validation.js";

const getUserId = (req: AuthRequest) => {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return req.user.userId;
};

export const listPropertyClosures = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listPropertyClosuresQuerySchema.parse(req.query);
  const data = await service.listPropertyClosures(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.type !== undefined && { type: query.type }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const createPropertyClosure = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createPropertyClosureSchema.parse(req.body);
  const data = await service.createPropertyClosure(
    getUserId(req),
    params.propertyId,
    body,
  );
  res.status(201).json({ success: true, data });
};

export const cancelPropertyClosure = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = closureIdParamsSchema.parse(req.params);
  const body = cancelPropertyClosureSchema.parse(req.body);
  const data = await service.cancelPropertyClosure(
    getUserId(req),
    params.id,
    body.reason,
  );
  res.json({ success: true, data });
};
