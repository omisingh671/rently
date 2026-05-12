import type { Request, Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import type { IdParams } from "@/common/types/params.js";
import type { PropertyStatus } from "@/generated/prisma/enums.js";
import { HttpError } from "@/common/errors/http-error.js";

import * as service from "./properties.service.js";
import {
  createPropertySchema,
  updatePropertySchema,
} from "./properties.schema.js";

/**
 * Create property
 */
export const create = async (req: AuthRequest, res: Response) => {
  const parsed = createPropertySchema.parse(req.body);
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  const input = {
    tenantId: parsed.tenantId,
    createdByUserId: userId,
    name: parsed.name,
    address: parsed.address,
    city: parsed.city,
    state: parsed.state,
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.amenityIds !== undefined && {
      amenityIds: parsed.amenityIds,
    }),
  };

  const property = await service.createProperty(input);
  res.status(201).json({ success: true, data: property });
};

/**
 * Get property by id
 */
export const getById = async (req: Request<IdParams>, res: Response) => {
  const property = await service.getPropertyById(req.params.id);
  res.json({ success: true, data: property });
};

/**
 * Update property
 */
export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updatePropertySchema.parse(req.body);

  const input = {
    ...(parsed.name !== undefined && { name: parsed.name }),
    ...(parsed.address !== undefined && { address: parsed.address }),
    ...(parsed.city !== undefined && { city: parsed.city }),
    ...(parsed.state !== undefined && { state: parsed.state }),
    ...(parsed.status !== undefined && { status: parsed.status }),
    ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
    ...(parsed.amenityIds !== undefined && {
      amenityIds: parsed.amenityIds,
    }),
  };

  const property = await service.updateProperty(req.params.id, input);
  res.json({ success: true, data: property });
};

/**
 * Admin list properties
 */
export const list = async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 10);

  const filters = {
    page,
    limit,

    ...(typeof req.query.search === "string" && {
      search: req.query.search,
    }),

    ...(typeof req.query.status === "string" && {
      status: req.query.status as PropertyStatus,
    }),

    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
  };

  const result = await service.listProperties(filters);
  res.json({ success: true, data: result });
};
