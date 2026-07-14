import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import { z } from "zod";
import * as service from "./email-deliveries.service.js";

const getUserId = (req: AuthRequest) => {
  if (!req.user?.userId) throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  return req.user.userId;
};

export const list = async (req: AuthRequest, res: Response) => {
  const data = await service.listEmailDeliveryJobs(getUserId(req));
  res.json({ success: true, data });
};

export const retry = async (req: AuthRequest, res: Response) => {
  const params = z.object({ id: z.string().min(1) }).parse(req.params);
  const data = await service.retryEmailDeliveryJob(getUserId(req), params.id);
  res.json({ success: true, data });
};
