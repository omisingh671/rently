import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./amenities.service.js";
import type {
  CreateAmenityInput,
  UpdateAmenityInput,
  ListAmenitiesFilters,
} from "./amenities.inputs.js";
import {
  createAmenitySchema,
  updateAmenitySchema,
  listAmenitiesQuerySchema,
  replacePropertyAmenityAssignmentsSchema,
  idParamsSchema,
  propertyIdParamsSchema,
} from "./amenities.schema.js";

const getUserId = (req: AuthRequest) => {
  if (!req.user?.userId) {
    throw new HttpError(401, "UNAUTHORIZED", "User not authenticated");
  }
  return req.user.userId;
};

/**
 * Create Amenity
 */
export const create = async (req: AuthRequest, res: Response) => {
  const body = createAmenitySchema.parse(req.body);
  const input: CreateAmenityInput = { name: body.name };
  if (body.icon !== undefined) {
    input.icon = body.icon;
  }
  const data = await service.createAmenity(getUserId(req), input);
  res.status(201).json({ success: true, data });
};

/**
 * Get Amenity by ID
 */
export const getById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getAmenityById(getUserId(req), params.id);
  res.json({ success: true, data });
};

/**
 * Update Amenity
 */
export const update = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateAmenitySchema.parse(req.body);
  const input: UpdateAmenityInput = {};
  if (body.name !== undefined) input.name = body.name;
  if (body.icon !== undefined) input.icon = body.icon;
  if (body.isActive !== undefined) input.isActive = body.isActive;
  const data = await service.updateAmenity(getUserId(req), params.id, input);
  res.json({ success: true, data });
};

/**
 * List Amenities
 */
export const list = async (req: AuthRequest, res: Response) => {
  const query = listAmenitiesQuerySchema.parse(req.query);
  const filters: ListAmenitiesFilters = {
    page: query.page,
    limit: query.limit,
  };
  if (query.search !== undefined) filters.search = query.search;
  if (query.isActive !== undefined) filters.isActive = query.isActive;
  const data = await service.listAmenities(getUserId(req), filters);
  res.json({ success: true, data });
};

/**
 * Get Property Amenity Assignments
 */
export const getPropertyAmenityAssignments = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const data = await service.getPropertyAmenityAssignments(
    getUserId(req),
    params.propertyId,
  );
  res.json({ success: true, data });
};

/**
 * Replace Property Amenity Assignments
 */
export const replacePropertyAmenityAssignments = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = replacePropertyAmenityAssignmentsSchema.parse(req.body);
  const data = await service.replacePropertyAmenityAssignments(
    getUserId(req),
    params.propertyId,
    body,
  );
  res.json({ success: true, data });
};
