import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./sessions.service.js";
import { listSessionsQuerySchema, idParamsSchema } from "./sessions.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }
  return userId;
};

export const listSessions = async (req: AuthRequest, res: Response) => {
  const query = listSessionsQuerySchema.parse(req.query);
  const data = await service.listSessions(
    getUserId(req),
    {
      page: query.page,
      limit: query.limit,
      ...(query.search !== undefined && { search: query.search }),
      ...(query.userId !== undefined && { userId: query.userId }),
      ...(query.role !== undefined && { role: query.role }),
      ...(query.status !== undefined && { status: query.status }),
    },
    req.cookies?.refreshToken,
  );
  res.json({ success: true, data });
};

export const revokeSession = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  await service.revokeSession(
    getUserId(req),
    params.id,
    req.cookies?.refreshToken,
  );
  res.status(204).send();
};

export const revokeExpiredSessions = async (
  req: AuthRequest,
  res: Response,
) => {
  const count = await service.revokeExpiredSessions(getUserId(req));
  res.json({ success: true, data: { count } });
};
