import type { Response } from "express";
import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import {
  accountingQuerySchema,
  journalParamsSchema,
} from "./accounting.schema.js";
import * as service from "./accounting.service.js";

const userId = (req: AuthRequest) => {
  if (!req.user?.userId)
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  return req.user.userId;
};

export const listJournal = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: await service.listJournal(
      userId(req),
      accountingQuerySchema.parse(req.query),
    ),
  });
};

export const getJournalEntry = async (req: AuthRequest, res: Response) => {
  const { id } = journalParamsSchema.parse(req.params);
  res.json({
    success: true,
    data: await service.getJournalEntry(userId(req), id),
  });
};

export const reconcile = async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: await service.reconcile(
      userId(req),
      accountingQuerySchema.parse(req.query),
    ),
  });
};
