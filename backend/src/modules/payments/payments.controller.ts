import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { idParamsSchema } from "@/modules/public/public.schema.js";
import { createManualPaymentSchema } from "./payments.schema.js";
import * as service from "./payments.service.js";

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
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    bookingId: params.id,
    idempotencyKey: body.idempotencyKey,
  });

  res.status(201).json({ success: true, data });
};
