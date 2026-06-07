import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./coupons.service.js";
import {
  createCouponSchema,
  idParamsSchema,
  listCouponsQuerySchema,
  propertyIdParamsSchema,
  updateCouponSchema,
} from "./coupons.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listCoupons = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listCouponsQuerySchema.parse(req.query);
  const data = await service.listCoupons(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.discountType !== undefined && {
      discountType: query.discountType,
    }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createCoupon = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createCouponSchema.parse(req.body);
  const data = await service.createCoupon(
    getUserId(req),
    params.propertyId,
    {
      code: body.code,
      name: body.name,
      ...(body.discountType !== undefined && {
        discountType: body.discountType,
      }),
      discountValue: body.discountValue,
      ...(body.maxUses !== undefined && { maxUses: body.maxUses }),
      ...(body.minNights !== undefined && { minNights: body.minNights }),
      ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
      validFrom: body.validFrom,
      ...(body.validTo !== undefined && { validTo: body.validTo }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.oncePerUser !== undefined && {
        oncePerUser: body.oncePerUser,
      }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const updateCoupon = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateCouponSchema.parse(req.body);
  const data = await service.updateCoupon(getUserId(req), params.id, {
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.discountType !== undefined && {
      discountType: body.discountType,
    }),
    ...(body.discountValue !== undefined && {
      discountValue: body.discountValue,
    }),
    ...(body.maxUses !== undefined && { maxUses: body.maxUses }),
    ...(body.minNights !== undefined && { minNights: body.minNights }),
    ...(body.minAmount !== undefined && { minAmount: body.minAmount }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
    ...(body.oncePerUser !== undefined && { oncePerUser: body.oncePerUser }),
  });
  res.json({ success: true, data });
};
