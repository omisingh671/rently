import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./leads.service.js";
import {
  idParamsSchema,
  propertyIdParamsSchema,
  listLeadsQuerySchema,
  updateLeadStatusSchema,
} from "./leads.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listEnquiries = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listLeadsQuerySchema.parse(req.query);
  const data = await service.listEnquiries(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.source !== undefined && { source: query.source }),
  });
  res.json({ success: true, data });
};

export const updateEnquiry = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateLeadStatusSchema.parse(req.body);
  const data = await service.updateEnquiry(getUserId(req), params.id, {
    status: body.status,
  });
  res.json({ success: true, data });
};

export const listQuotes = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listLeadsQuerySchema.parse(req.query);
  const data = await service.listQuotes(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const updateQuote = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateLeadStatusSchema.parse(req.body);
  const data = await service.updateQuote(getUserId(req), params.id, {
    status: body.status,
  });
  res.json({ success: true, data });
};
