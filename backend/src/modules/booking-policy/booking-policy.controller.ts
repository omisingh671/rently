import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./booking-policy.service.js";
import {
  propertyIdParamsSchema,
  updateBookingPolicySchema,
} from "./booking-policy.validation.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const getBookingPolicy = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const data = await service.getBookingPolicy(getUserId(req), params.propertyId);
  res.json({ success: true, data });
};

export const updateBookingPolicy = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = updateBookingPolicySchema.parse(req.body);
  const data = await service.updateBookingPolicy(getUserId(req), params.propertyId, body);
  res.json({ success: true, data });
};
