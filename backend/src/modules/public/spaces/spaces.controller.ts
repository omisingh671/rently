import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { resolveTenantInput } from "@/modules/public/tenant/tenant.controller.js";
import * as service from "./spaces.service.js";
import { idParamsSchema } from "./spaces.schema.js";

export const listSpaces = async (req: AuthRequest, res: Response) => {
  const data = await service.listSpaces(resolveTenantInput(req));
  res.json({ success: true, data });
};

export const getSpaceById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getSpaceById(params.id, resolveTenantInput(req));
  res.json({ success: true, data });
};

export const getPropertyBookingPolicy = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getPropertyBookingPolicy(
    params.id,
    resolveTenantInput(req),
  );
  res.json({ success: true, data });
};
