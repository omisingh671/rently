import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { idParamsSchema } from "@/modules/public/tenant/tenant.schema.js";
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
    amount: req.body.amount,
    purpose: req.body.purpose,
    status: req.body.status,
  });

  const data = await service.createManualPayment({
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    bookingId: params.id,
    idempotencyKey: body.idempotencyKey,
    ...(body.amount !== undefined && { amount: body.amount }),
    ...(body.purpose !== undefined && { purpose: body.purpose }),
    ...(body.status !== undefined && { status: body.status }),
  });

  res.status(201).json({ success: true, data });
};
