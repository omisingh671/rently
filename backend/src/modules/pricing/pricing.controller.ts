import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./pricing.service.js";
import {
  listRoomPricingQuerySchema,
  createRoomPricingSchema,
  updateRoomPricingSchema,
  idParamsSchema,
  propertyIdParamsSchema,
} from "./pricing.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listRoomPricingQuerySchema.parse(req.query);
  const data = await service.listRoomPricing(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.productId !== undefined && { productId: query.productId }),
    ...(query.rateType !== undefined && { rateType: query.rateType }),
    ...(query.pricingTier !== undefined && { pricingTier: query.pricingTier }),
  });
  res.json({ success: true, data });
};

export const createRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createRoomPricingSchema.parse(req.body);
  const data = await service.createRoomPricing(
    getUserId(req),
    params.propertyId,
    {
      productId: body.productId,
      ...(body.unitId !== undefined && { unitId: body.unitId }),
      ...(body.roomId !== undefined && { roomId: body.roomId }),
      ...(body.rateType !== undefined && { rateType: body.rateType }),
      ...(body.pricingTier !== undefined && {
        pricingTier: body.pricingTier,
      }),
      ...(body.minNights !== undefined && { minNights: body.minNights }),
      ...(body.maxNights !== undefined && { maxNights: body.maxNights }),
      ...(body.taxInclusive !== undefined && {
        taxInclusive: body.taxInclusive,
      }),
      price: body.price,
      validFrom: body.validFrom,
      ...(body.validTo !== undefined && { validTo: body.validTo }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateRoomPricingSchema.parse(req.body);
  const data = await service.updateRoomPricing(getUserId(req), params.id, {
    ...(body.productId !== undefined && { productId: body.productId }),
    ...(body.unitId !== undefined && { unitId: body.unitId }),
    ...(body.roomId !== undefined && { roomId: body.roomId }),
    ...(body.rateType !== undefined && { rateType: body.rateType }),
    ...(body.pricingTier !== undefined && { pricingTier: body.pricingTier }),
    ...(body.minNights !== undefined && { minNights: body.minNights }),
    ...(body.maxNights !== undefined && { maxNights: body.maxNights }),
    ...(body.taxInclusive !== undefined && {
      taxInclusive: body.taxInclusive,
    }),
    ...(body.price !== undefined && { price: body.price }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
  });
  res.json({ success: true, data });
};

export const deleteRoomPricing = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.deleteRoomPricing(getUserId(req), params.id);
  res.status(204).send();
};
