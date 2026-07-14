import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./maintenance.service.js";
import {
  idParamsSchema,
  propertyIdParamsSchema,
  listMaintenanceQuerySchema,
  createMaintenanceSchema,
  updateMaintenanceSchema,
} from "./maintenance.validation.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listMaintenanceBlocks = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listMaintenanceQuerySchema.parse(req.query);
  const data = await service.listMaintenanceBlocks(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.targetType !== undefined && { targetType: query.targetType }),
  });
  res.json({ success: true, data });
};

export const getMaintenanceBlockById = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getMaintenanceBlockById(
    getUserId(req),
    params.id,
  );
  res.json({ success: true, data });
};

export const createMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createMaintenanceSchema.parse(req.body);
  const data = await service.createMaintenanceBlock(
    getUserId(req),
    params.propertyId,
    {
      targetType: body.targetType,
      ...(body.unitId !== undefined && { unitId: body.unitId }),
      ...(body.roomId !== undefined && { roomId: body.roomId }),
      ...(body.reason !== undefined && { reason: body.reason }),
      priority: body.priority,
      ...(body.assignedToUserId !== undefined && {
        assignedToUserId: body.assignedToUserId,
      }),
      ...(body.emergencyOverride !== undefined && {
        emergencyOverride: body.emergencyOverride,
      }),
      ...(body.emergencyReason !== undefined && {
        emergencyReason: body.emergencyReason,
      }),
      startDate: body.startDate,
      endDate: body.endDate,
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateMaintenanceSchema.parse(req.body);
  const data = await service.updateMaintenanceBlock(getUserId(req), params.id, {
    ...(body.targetType !== undefined && { targetType: body.targetType }),
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.roomId !== undefined && { roomId: body.roomId }),
    ...(body.reason !== undefined && { reason: body.reason }),
    ...(body.status !== undefined && { status: body.status }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.assignedToUserId !== undefined && {
      assignedToUserId: body.assignedToUserId,
    }),
    ...(body.resolutionNote !== undefined && {
      resolutionNote: body.resolutionNote,
    }),
    ...(body.emergencyOverride !== undefined && {
      emergencyOverride: body.emergencyOverride,
    }),
    ...(body.emergencyReason !== undefined && {
      emergencyReason: body.emergencyReason,
    }),
    ...(body.startDate !== undefined && { startDate: body.startDate }),
    ...(body.endDate !== undefined && { endDate: body.endDate }),
  });
  res.json({ success: true, data });
};

export const deleteMaintenanceBlock = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteMaintenanceBlock(getUserId(req), params.id);
  res.status(204).send();
};
