import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import {
  resolveTenantInput,
  getUserId,
} from "@/modules/public/tenant/tenant.controller.js";
import { idParamsSchema } from "@/modules/public/tenant/tenant.schema.js";
import * as service from "./bookings.service.js";
import {
  createBookingSchema,
  createBookingQuoteSchema,
  bookingCheckoutQuoteSchema,
  updateBookingCheckoutSchema,
  cancelBookingSchema,
  createRefundRequestSchema,
} from "./bookings.schema.js";

export const createBooking = async (req: AuthRequest, res: Response) => {
  const body = createBookingSchema.parse(req.body);
  const data = await service.createBooking(
    req.user?.userId,
    {
      bookingType: body.bookingType,
      ...(body.bookingOptionId !== undefined && {
        bookingOptionId: body.bookingOptionId,
      }),
      ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
      ...(body.inventoryLockToken !== undefined && {
        inventoryLockToken: body.inventoryLockToken,
      }),
      ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
      ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
      from: body.from,
      to: body.to,
      guests: body.guests,
      comfortOption: body.comfortOption,
      couponCode: body.couponCode,
      ...(body.guestDetails !== undefined && {
        guestDetails: body.guestDetails,
      }),
    },
    resolveTenantInput(req),
  );

  res.status(201).json({ success: true, data });
};

export const getBookingQuote = async (req: AuthRequest, res: Response) => {
  const body = createBookingQuoteSchema.parse(req.body);
  const data = await service.getBookingQuote(
    req.user?.userId,
    {
      bookingType: body.bookingType,
      ...(body.bookingOptionId !== undefined && {
        bookingOptionId: body.bookingOptionId,
      }),
      ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
      ...(body.inventoryLockToken !== undefined && {
        inventoryLockToken: body.inventoryLockToken,
      }),
      ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
      ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
      from: body.from,
      to: body.to,
      guests: body.guests,
      comfortOption: body.comfortOption,
      couponCode: body.couponCode,
    },
    resolveTenantInput(req),
  );

  res.json({ success: true, data });
};

export const getBookingCheckoutQuote = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = bookingCheckoutQuoteSchema.parse(req.body);
  const data = await service.getBookingCheckoutQuote(
    req.user?.userId,
    params.id,
    {
      ...(body.couponCode !== undefined && { couponCode: body.couponCode }),
      ...(body.editToken !== undefined && { editToken: body.editToken }),
    },
  );

  res.json({ success: true, data });
};

export const updateBookingCheckout = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateBookingCheckoutSchema.parse(req.body);
  const data = await service.updateBookingCheckout(
    req.user?.userId,
    params.id,
    {
      guestDetails: body.guestDetails,
      ...(body.couponCode !== undefined && { couponCode: body.couponCode }),
      ...(body.editToken !== undefined && { editToken: body.editToken }),
    },
  );

  res.json({ success: true, data });
};

export const listBookings = async (req: AuthRequest, res: Response) => {
  const data = await service.listBookings(getUserId(req));
  res.json({ success: true, data });
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data =
    req.user?.userId !== undefined
      ? await service.getBookingById(req.user.userId, params.id)
      : await service.getBookingByIdPublic(params.id);
  res.json({ success: true, data });
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = cancelBookingSchema.parse(req.body);
  const data = await service.cancelBooking(
    getUserId(req),
    params.id,
    body.reason,
  );
  res.json({ success: true, data });
};

export const getCancellationPreview = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getCancellationPreview(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const getRefundPreview = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getRefundPreview(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createRefundRequest = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = createRefundRequestSchema.parse(req.body);
  const data = await service.createRefundRequest(
    getUserId(req),
    params.id,
    body.reason,
  );
  res.status(201).json({ success: true, data });
};
