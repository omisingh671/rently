import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./property-assignments.service.js";
import {
  listAssignmentsQuerySchema,
  createAssignmentSchema,
  idParamsSchema,
} from "./property-assignments.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listPropertyAssignments = async (
  req: AuthRequest,
  res: Response,
) => {
  const query = listAssignmentsQuerySchema.parse(req.query);
  const data = await service.listPropertyAssignments(getUserId(req), {
    page: query.page,
    limit: query.limit,
    ...(query.propertyId !== undefined && { propertyId: query.propertyId }),
    ...(query.role !== undefined && { role: query.role }),
  });
  res.json({ success: true, data });
};

export const createPropertyAssignment = async (
  req: AuthRequest,
  res: Response,
) => {
  const body = createAssignmentSchema.parse(req.body);
  const data = await service.createPropertyAssignment(getUserId(req), body);
  res.status(201).json({ success: true, data });
};

export const deletePropertyAssignment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  await service.deletePropertyAssignment(getUserId(req), params.id);
  res.status(204).send();
};
