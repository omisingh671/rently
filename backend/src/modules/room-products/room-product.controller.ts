import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./room-product.service.js";
import {
  idParamsSchema,
  propertyIdParamsSchema,
  listRoomProductsQuerySchema,
  createRoomProductSchema,
  updateRoomProductSchema,
} from "./room-product.validation.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listRoomProducts = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomProductsQuerySchema.parse(req.query);
  const data = await service.listRoomProducts(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.category !== undefined && { category: query.category }),
  });
  res.json({ success: true, data });
};

export const createRoomProduct = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomProductSchema.parse(req.body);
  const data = await service.createRoomProduct(
    getUserId(req),
    params.propertyId,
    {
      name: body.name,
      occupancy: body.occupancy,
      hasAC: body.hasAC,
      category: body.category,
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateRoomProduct = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomProductSchema.parse(req.body);
  const data = await service.updateRoomProduct(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.occupancy !== undefined && { occupancy: body.occupancy }),
    ...(body.hasAC !== undefined && { hasAC: body.hasAC }),
    ...(body.category !== undefined && { category: body.category }),
  });
  res.json({ success: true, data });
};
