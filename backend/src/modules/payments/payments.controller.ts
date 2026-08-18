import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { PaymentProvider } from "@/generated/prisma/client.js";
import { idParamsSchema } from "@/modules/public/tenant/tenant.schema.js";
import {
  completeMockPaymentSchema,
  createGatewayPaymentIntentSchema,
  createManualPaymentSchema,
  verifyGatewayPaymentSchema,
} from "./payments.schema.js";
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
    checkoutToken: req.body.checkoutToken,
    amount: req.body.amount,
    purpose: req.body.purpose,
    status: req.body.status,
  });

  const data = await service.createManualPayment({
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    bookingId: params.id,
    ...(body.checkoutToken !== undefined && {
      checkoutToken: body.checkoutToken,
    }),
    idempotencyKey: body.idempotencyKey,
    ...(body.amount !== undefined && { amount: body.amount }),
    ...(body.purpose !== undefined && { purpose: body.purpose }),
    ...(body.status !== undefined && { status: body.status }),
  });

  res.status(201).json({ success: true, data });
};

export const createGatewayPaymentIntent = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = createGatewayPaymentIntentSchema.parse({
    idempotencyKey: getIdempotencyKey(req),
    checkoutToken: req.body.checkoutToken,
    amount: req.body.amount,
    purpose: req.body.purpose,
  });
  const data = await service.createGatewayPaymentIntent({
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    bookingId: params.id,
    ...(body.checkoutToken !== undefined && {
      checkoutToken: body.checkoutToken,
    }),
    idempotencyKey: body.idempotencyKey,
    ...(body.amount !== undefined && { amount: body.amount }),
    ...(body.purpose !== undefined && { purpose: body.purpose }),
  });
  res.status(201).json({ success: true, data });
};

export const verifyGatewayPayment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = verifyGatewayPaymentSchema.parse(req.body);
  const data = await service.verifyGatewayPayment({
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    paymentId: params.id,
    ...(body.checkoutToken !== undefined && {
      checkoutToken: body.checkoutToken,
    }),
    providerOrderId: body.providerOrderId,
    ...(body.providerPaymentId !== undefined && {
      providerPaymentId: body.providerPaymentId,
    }),
    ...(body.providerSignature !== undefined && {
      providerSignature: body.providerSignature,
    }),
  });
  res.json({ success: true, data });
};

export const completeMockGatewayPayment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = completeMockPaymentSchema.parse(req.body);
  const data = await service.completeMockGatewayPayment({
    ...(req.user?.userId !== undefined && { userId: req.user.userId }),
    paymentId: params.id,
    ...(body.checkoutToken !== undefined && {
      checkoutToken: body.checkoutToken,
    }),
    outcome: body.outcome,
  });
  res.json({ success: true, data });
};

export const handleGatewayWebhook = async (
  req: AuthRequest,
  res: Response,
) => {
  const requestedProvider = req.params.provider?.toUpperCase();
  const provider = Object.values(PaymentProvider).find(
    (candidate) => candidate === requestedProvider,
  );
  if (!provider || provider === PaymentProvider.MANUAL) {
    res.status(404).json({
      error: {
        code: "PAYMENT_PROVIDER_NOT_FOUND",
        message: "Payment provider is not configured",
      },
    });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({
      error: {
        code: "PAYMENT_WEBHOOK_INVALID",
        message: "Webhook raw body is missing",
      },
    });
    return;
  }
  const data = await service.processGatewayWebhook({
    provider,
    rawBody: req.body,
    headers: req.headers,
  });
  res.json({ success: true, data });
};
