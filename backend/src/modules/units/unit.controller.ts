import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import type { UnitStatus } from "@/generated/prisma/enums.js";
import { HttpError } from "@/common/errors/http-error.js";


import * as service from "./unit.service.js";
import { createUnitSchema, updateUnitSchema } from "./unit.validation.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

/**
 * Create unit
 * POST /admin/properties/:propertyId/units
 */
export const create = async (
  req: AuthRequest,
  res: Response,
) => {
  const userId = getUserId(req);
  const parsed = createUnitSchema.parse(req.body);

  const input = {
    propertyId: req.params.propertyId!,
    unitNumber: parsed.unitNumber,
    floor: parsed.floor,
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.amenityIds !== undefined && {
      amenityIds: parsed.amenityIds,
    }),
  };

  const unit = await service.create(userId, input);

  res.status(201).json({ success: true, data: unit });
};

/**
 * Get unit by id
 * GET /admin/units/:id
 */
export const getById = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const unit = await service.getById(userId, req.params.id!);
  res.json({ success: true, data: unit });
};

/**
 * Update unit
 * PATCH /admin/units/:id
 */
export const update = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  const parsed = updateUnitSchema.parse(req.body);

  const input = {
    ...(parsed.unitNumber !== undefined && {
      unitNumber: parsed.unitNumber,
    }),
    ...(parsed.floor !== undefined && {
      floor: parsed.floor,
    }),
    ...(parsed.status !== undefined && {
      status: parsed.status,
    }),
    ...(parsed.isActive !== undefined && {
      isActive: parsed.isActive,
    }),
    ...(parsed.amenityIds !== undefined && {
      amenityIds: parsed.amenityIds,
    }),
  };

  const unit = await service.update(userId, req.params.id!, input);

  res.json({ success: true, data: unit });
};

/**
 * Soft delete unit
 * DELETE /admin/units/:id
 */
export const remove = async (req: AuthRequest, res: Response) => {
  const userId = getUserId(req);
  await service.softDelete(userId, req.params.id!);
  res.json({ success: true });
};

/**
 * List units by property
 * GET /admin/properties/:propertyId/units
 */
export const list = async (
  req: AuthRequest,
  res: Response,
) => {
  const userId = getUserId(req);
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);

  const filters = {
    propertyId: req.params.propertyId!,
    page,
    pageSize,

    ...(typeof req.query.search === "string" && {
      search: req.query.search,
    }),

    ...(typeof req.query.status === "string" && {
      status: req.query.status as UnitStatus,
    }),

    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
  };

  const result = await service.listByProperty(userId, filters);

  res.json({ success: true, data: result });
};
