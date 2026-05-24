import type { Request, Response } from "express";
import type { IdParams } from "@/common/types/params.js";

import * as service from "./amenities.service.js";
import {
  createAmenitySchema,
  updateAmenitySchema,
} from "./amenities.schema.js";

/**
 * Create Amenity
 */
export const create = async (req: Request, res: Response) => {
  const parsed = createAmenitySchema.parse(req.body);

  const input = {
    name: parsed.name,
    ...(parsed.icon !== undefined && { icon: parsed.icon }),
  };

  const amenity = await service.createAmenity(input);

  res.status(201).json({
    success: true,
    data: amenity,
  });
};

/**
 * Get Amenity by ID
 */
export const getById = async (req: Request<IdParams>, res: Response) => {
  const amenity = await service.getAmenityById(req.params.id);

  res.json({
    success: true,
    data: amenity,
  });
};

/**
 * Update Amenity
 */
export const update = async (req: Request<IdParams>, res: Response) => {
  const parsed = updateAmenitySchema.parse(req.body);

  const input = {
    ...(parsed.name !== undefined && { name: parsed.name }),
    ...(parsed.icon !== undefined && { icon: parsed.icon }),
    ...(parsed.isActive !== undefined && {
      isActive: parsed.isActive,
    }),
  };

  const amenity = await service.updateAmenity(req.params.id, input);

  res.json({
    success: true,
    data: amenity,
  });
};

/**
 * Admin list Amenities
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

    ...(req.query.isActive === "true" && { isActive: true }),
    ...(req.query.isActive === "false" && { isActive: false }),
  };

  const result = await service.listAmenities(filters);

  res.json({
    success: true,
    data: result,
  });
};
