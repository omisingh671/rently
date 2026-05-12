import type { Response } from "express";
import { HttpError } from "@/common/errors/http-error.js";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { idParamsSchema } from "@/modules/public/public.schema.js";
import { createManualPaymentSchema } from "./payments.schema.js";
import * as service from "./payments.service.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

const getIdempotencyKey = (req: AuthRequest) => {
  const headerValue = req.headers["idempotency-key"];
  return typeof headerValue === "string" ? headerValue : req.body.idempotencyKey;
};

export const createManualPayment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = createManualPaymentSchema.parse({
    idempotencyKey: getIdempotencyKey(req),
  });

  const data = await service.createManualPayment({
    userId: getUserId(req),
    bookingId: params.id,
    idempotencyKey: body.idempotencyKey,
  });

  res.status(201).json({ success: true, data });
};
