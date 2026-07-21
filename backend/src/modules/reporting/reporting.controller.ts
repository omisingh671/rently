import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./reporting.service.js";
import {
  createDailyCloseSchema,
  getAnalyticsQuerySchema,
  listDailyClosesQuerySchema,
  reportingPropertyParamsSchema,
} from "./reporting.schema.js";

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

export const listDailyCloses = async (req: AuthRequest, res: Response) => {
  const params = reportingPropertyParamsSchema.parse(req.params);
  const query = listDailyClosesQuerySchema.parse(req.query);
  const data = await service.listPropertyDailyCloses(
    getUserId(req),
    params.propertyId,
    query.startDate,
    query.endDate,
  );
  res.json({ success: true, data });
};

export const createDailyClose = async (req: AuthRequest, res: Response) => {
  const params = reportingPropertyParamsSchema.parse(req.params);
  const body = createDailyCloseSchema.parse(req.body);
  const data = await service.closePropertyBusinessDate(
    getUserId(req),
    params.propertyId,
    body.businessDate,
    body.note,
  );
  res.status(201).json({ success: true, data });
};
