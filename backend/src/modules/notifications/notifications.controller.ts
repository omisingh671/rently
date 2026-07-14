import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as settingsService from "./notifications.settings.service.js";
import * as deliveryService from "./notifications.delivery.service.js";
import {
  deliveryParamsSchema,
  propertyParamsSchema,
  settingsQuerySchema,
  updateGlobalSettingSchema,
  updatePropertyOverrideSchema,
} from "./notifications.schema.js";

const getUserId = (req: AuthRequest) => {
  if (!req.user?.userId) throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  return req.user.userId;
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  const query = settingsQuerySchema.parse(req.query);
  res.json({ success: true, data: await settingsService.getSettings(getUserId(req), query.propertyId) });
};

export const updateGlobalSetting = async (req: AuthRequest, res: Response) => {
  const input = updateGlobalSettingSchema.parse(req.body);
  res.json({ success: true, data: await settingsService.setGlobalSetting(getUserId(req), input) });
};

export const updatePropertyOverride = async (req: AuthRequest, res: Response) => {
  const { propertyId } = propertyParamsSchema.parse(req.params);
  const input = updatePropertyOverrideSchema.parse(req.body);
  res.json({ success: true, data: await settingsService.setPropertyOverride(getUserId(req), propertyId, input) });
};

export const getAudits = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await settingsService.getAudits(getUserId(req)) });
};

export const getDeliveries = async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: await deliveryService.listDeliveryJobs(getUserId(req)) });
};

export const retryDelivery = async (req: AuthRequest, res: Response) => {
  const { id } = deliveryParamsSchema.parse(req.params);
  res.json({ success: true, data: await deliveryService.retryDeliveryJob(getUserId(req), id) });
};
