import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./bookings.service.js";
import {
  createManualBookingSchema,
  idParamsSchema,
  listBookingsQuerySchema,
  roomBoardQuerySchema,
  propertyIdParamsSchema,
  recordBookingPaymentSchema,
  recordBookingRefundSchema,
  refundRequestParamsSchema,
  checkManualBookingAvailabilitySchema,
  updateBookingStatusSchema,
  updateRefundRequestSchema,
} from "./bookings.schema.js";

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const getRoomBoard = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = roomBoardQuerySchema.parse(req.query);
  const data = await service.getRoomBoard(getUserId(req), params.propertyId, {
    from: query.from,
    to: query.to,
  });
  res.json({ success: true, data });
};

export const listBookings = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = listBookingsQuerySchema.parse(req.query);
  const data = await service.listBookings(getUserId(req), {
    propertyId: params.propertyId,
    page: query.page,
    limit: query.limit,
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
  });
  res.json({ success: true, data });
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getBookingById(getUserId(req), params.id);
  res.json({ success: true, data });
};

export const createManualBooking = async (req: AuthRequest, res: Response) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = createManualBookingSchema.parse(req.body);
  const data = await service.createManualBooking(getUserId(req), params.propertyId, {
    bookingType: body.bookingType,
    ...(body.bookingOptionId !== undefined && {
      bookingOptionId: body.bookingOptionId,
    }),
    ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
    ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
    from: body.from,
    to: body.to,
    guests: body.guests,
    comfortOption: body.comfortOption,
    couponCode: body.couponCode,
    guestName: body.guestName,
    guestEmail: body.guestEmail,
    ...(body.countryCode !== undefined && { countryCode: body.countryCode }),
    ...(body.contactNumber !== undefined && {
      contactNumber: body.contactNumber,
    }),
    ...(body.internalNotes !== undefined && {
      internalNotes: body.internalNotes,
    }),
  });
  res.status(201).json({ success: true, data });
};

export const checkManualBookingAvailability = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const body = checkManualBookingAvailabilitySchema.parse(req.body);
  const data = await service.checkManualBookingAvailability(
    getUserId(req),
    params.propertyId,
    {
      ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
      from: body.from,
      to: body.to,
      guests: body.guests,
      comfortOption: body.comfortOption,
    },
  );
  res.json({ success: true, data });
};

export const updateBooking = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = updateBookingStatusSchema.parse(req.body);
  const data = await service.updateBooking(getUserId(req), params.id, {
    ...(body.status !== undefined && { status: body.status }),
    ...(body.internalNotes !== undefined && {
      internalNotes: body.internalNotes,
    }),
    ...(body.note !== undefined && { note: body.note }),
    ...(body.roomId !== undefined && { roomId: body.roomId }),
    ...(body.roomIds !== undefined && { roomIds: body.roomIds }),
    ...(body.statusOverride !== undefined && {
      statusOverride: body.statusOverride,
    }),
    ...(body.allowBalanceDueCheckIn !== undefined && {
      allowBalanceDueCheckIn: body.allowBalanceDueCheckIn,
    }),
  });
  res.json({ success: true, data });
};

export const recordBookingPayment = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = recordBookingPaymentSchema.parse(req.body);
  const data = await service.recordBookingBalancePayment(
    getUserId(req),
    params.id,
    {
      amount: body.amount,
      method: body.method,
      ...(body.referenceId !== undefined && { referenceId: body.referenceId }),
      ...(body.payerDetail !== undefined && { payerDetail: body.payerDetail }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.paidAt !== undefined && { paidAt: body.paidAt }),
      ...(body.idempotencyKey !== undefined && {
        idempotencyKey: body.idempotencyKey,
      }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const recordBookingRefund = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = recordBookingRefundSchema.parse(req.body);
  const data = await service.recordBookingRefund(getUserId(req), params.id, {
    paymentId: body.paymentId,
    amount: body.amount,
    method: body.method,
    reason: body.reason,
    ...(body.refundRequestId !== undefined && {
      refundRequestId: body.refundRequestId,
    }),
    ...(body.idempotencyKey !== undefined && {
      idempotencyKey: body.idempotencyKey,
    }),
  });
  res.status(201).json({ success: true, data });
};

export const updateRefundRequest = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = refundRequestParamsSchema.parse(req.params);
  const body = updateRefundRequestSchema.parse(req.body);
  const data = await service.updateRefundRequest(
    getUserId(req),
    params.id,
    params.requestId,
    {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.adminNote !== undefined && { adminNote: body.adminNote }),
    },
  );
  res.json({ success: true, data });
};
