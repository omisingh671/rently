import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./reporting.service.js";
import { getAnalyticsQuerySchema } from "./reporting.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const getContext = async (req: AuthRequest, res: Response) => {
  const data = await service.getReportingContext(getUserId(req));
  res.json({ success: true, data });
};

export const getSummary = async (req: AuthRequest, res: Response) => {
  const data = await service.getReportingSummary(getUserId(req));
  res.json({ success: true, data });
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  const query = getAnalyticsQuerySchema.parse(req.query);
  const data = await service.getReportingAnalytics(getUserId(req), query);
  res.json({ success: true, data });
};
