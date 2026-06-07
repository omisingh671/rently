import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./taxes.service.js";
import {
  createTaxSchema,
  idParamsSchema,
  listTaxesQuerySchema,
  propertyIdParamsSchema,
  updateTaxSchema,
} from "./taxes.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listTaxes = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listTaxesQuerySchema.parse(req.query);
  const data = await service.listTaxes(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.taxType !== undefined && { taxType: query.taxType }),
    ...(query.category !== undefined && { category: query.category }),
    ...(query.scope !== undefined && { scope: query.scope }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  });
  res.json({ success: true, data });
};

export const createTax = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createTaxSchema.parse(req.body);
  const data = await service.createTax(getUserId(req), params.propertyId, {
    name: body.name,
    rate: body.rate,
    ...(body.taxType !== undefined && { taxType: body.taxType }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.scope !== undefined && { scope: body.scope }),
    ...(body.targetType !== undefined && { targetType: body.targetType }),
    ...(body.calculationMode !== undefined && {
      calculationMode: body.calculationMode,
    }),
    ...(body.discountTreatment !== undefined && {
      discountTreatment: body.discountTreatment,
    }),
    ...(body.minTariff !== undefined && { minTariff: body.minTariff }),
    ...(body.maxTariff !== undefined && { maxTariff: body.maxTariff }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.appliesTo !== undefined && { appliesTo: body.appliesTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.status(201).json({ success: true, data });
};

export const updateTax = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateTaxSchema.parse(req.body);
  const data = await service.updateTax(getUserId(req), params.id, {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.rate !== undefined && { rate: body.rate }),
    ...(body.taxType !== undefined && { taxType: body.taxType }),
    ...(body.category !== undefined && { category: body.category }),
    ...(body.scope !== undefined && { scope: body.scope }),
    ...(body.targetType !== undefined && { targetType: body.targetType }),
    ...(body.calculationMode !== undefined && {
      calculationMode: body.calculationMode,
    }),
    ...(body.discountTreatment !== undefined && {
      discountTreatment: body.discountTreatment,
    }),
    ...(body.minTariff !== undefined && { minTariff: body.minTariff }),
    ...(body.maxTariff !== undefined && { maxTariff: body.maxTariff }),
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validTo !== undefined && { validTo: body.validTo }),
    ...(body.priority !== undefined && { priority: body.priority }),
    ...(body.appliesTo !== undefined && { appliesTo: body.appliesTo }),
    ...(body.isActive !== undefined && { isActive: body.isActive }),
  });
  res.json({ success: true, data });
};
