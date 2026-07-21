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
  cashierSummaryQuerySchema,
  checkInBookingSchema,
  checkOutBookingSchema,
  reverseBookingLifecycleSchema,
  createBookingFolioChargeSchema,
  moveBookingRoomSchema,
  previewBookingRoomMoveSchema,
  noShowBookingSchema,
  operationsBoardQuerySchema,
  updateRoomHousekeepingSchema,
  voidBookingFolioChargeSchema,
  previewStayExtensionSchema,
  commitStayExtensionSchema,
  previewBookingLifecyclePolicySchema,
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
  });
  res.json({ success: true, data });
};

export const checkInBooking = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = checkInBookingSchema.parse(req.body);
  const data = await service.checkInBooking(getUserId(req), params.id, {
    expectedVersion: body.expectedVersion,
    identityVerified: true,
    ...(body.roomIds !== undefined && { roomIds: body.roomIds }),
    ...(body.identityDocumentType !== undefined && {
      identityDocumentType: body.identityDocumentType,
    }),
    ...(body.identityDocumentReference !== undefined && {
      identityDocumentReference: body.identityDocumentReference,
    }),
    ...(body.allowBalanceDueCheckIn !== undefined && {
      allowBalanceDueCheckIn: body.allowBalanceDueCheckIn,
    }),
    ...(body.note !== undefined && { note: body.note }),
    ...(body.policyFingerprint !== undefined && {
      policyFingerprint: body.policyFingerprint,
    }),
    ...(body.allowPolicyOverride !== undefined && {
      allowPolicyOverride: body.allowPolicyOverride,
    }),
    ...(body.overrideReason !== undefined && {
      overrideReason: body.overrideReason,
    }),
  });
  res.json({ success: true, data });
};

export const previewCheckInPolicy = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = previewBookingLifecyclePolicySchema.parse(req.body);
  const data = await service.previewCheckInPolicy(
    getUserId(req),
    params.id,
    body.expectedVersion,
  );
  res.json({ success: true, data });
};

export const checkOutBooking = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = checkOutBookingSchema.parse(req.body);
  const data = await service.checkOutBooking(getUserId(req), params.id, {
    expectedVersion: body.expectedVersion,
    ...(body.allowBalanceDueCheckout !== undefined && {
      allowBalanceDueCheckout: body.allowBalanceDueCheckout,
    }),
    ...(body.note !== undefined && { note: body.note }),
    ...(body.policyFingerprint !== undefined && {
      policyFingerprint: body.policyFingerprint,
    }),
  });
  res.json({ success: true, data });
};

export const previewCheckOutPolicy = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = previewBookingLifecyclePolicySchema.parse(req.body);
  const data = await service.previewCheckOutPolicy(
    getUserId(req),
    params.id,
    body.expectedVersion,
  );
  res.json({ success: true, data });
};

export const markBookingNoShow = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = noShowBookingSchema.parse(req.body);
  const data = await service.markBookingNoShow(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const moveBookingRooms = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = moveBookingRoomSchema.parse(req.body);
  const data = await service.moveBookingRooms(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const previewBookingRoomMove = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = previewBookingRoomMoveSchema.parse(req.body);
  const data = await service.previewBookingRoomMove(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const previewStayExtension = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = previewStayExtensionSchema.parse(req.body);
  const data = await service.previewStayExtension(getUserId(req), params.id, body);
  res.json({ success: true, data });
};

export const extendStay = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const body = commitStayExtensionSchema.parse(req.body);
  const data = await service.extendStay(getUserId(req), params.id, {
    expectedVersion: body.expectedVersion,
    newCheckOut: body.newCheckOut,
    pricingFingerprint: body.pricingFingerprint,
    pricingAction: body.pricingAction,
    note: body.note,
    ...(body.overrideReason !== undefined && {
      overrideReason: body.overrideReason,
    }),
  });
  res.json({ success: true, data });
};

export const reverseBookingLifecycle = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = reverseBookingLifecycleSchema.parse(req.body);
  const data = await service.reverseBookingLifecycle(
    getUserId(req),
    params.id,
    {
      expectedVersion: body.expectedVersion,
      note: body.note,
    },
  );
  res.json({ success: true, data });
};

export const updateRoomHousekeeping = async (
  req: AuthRequest,
  res: Response,
) => {
  const propertyParams = propertyIdParamsSchema.parse(req.params);
  const roomParams = idParamsSchema.parse({ id: req.params.roomId });
  const body = updateRoomHousekeepingSchema.parse(req.body);
  const data = await service.updateRoomHousekeeping(
    getUserId(req),
    propertyParams.propertyId,
    roomParams.id,
    {
      expectedStatus: body.expectedStatus,
      status: body.status,
      ...(body.note !== undefined && { note: body.note }),
    },
  );
  res.json({ success: true, data });
};

export const createBookingFolioCharge = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const body = createBookingFolioChargeSchema.parse(req.body);
  const data = await service.createBookingFolioCharge(
    getUserId(req),
    params.id,
    {
      expectedVersion: body.expectedVersion,
      type: body.type,
      description: body.description,
      amount: body.amount,
      ...(body.note !== undefined && { note: body.note }),
    },
  );
  res.status(201).json({ success: true, data });
};

export const voidBookingFolioCharge = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = idParamsSchema.parse(req.params);
  const chargeParams = idParamsSchema.parse({ id: req.params.chargeId });
  const body = voidBookingFolioChargeSchema.parse(req.body);
  const data = await service.voidBookingFolioCharge(
    getUserId(req),
    params.id,
    chargeParams.id,
    body,
  );
  res.json({ success: true, data });
};

export const getOperationsBoard = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = operationsBoardQuerySchema.parse(req.query);
  const data = await service.getOperationsBoard(
    getUserId(req),
    params.propertyId,
    query.businessDate,
  );
  res.json({ success: true, data });
};

export const getCashierSummary = async (
  req: AuthRequest,
  res: Response,
) => {
  const params = propertyIdParamsSchema.parse(req.params);
  const query = cashierSummaryQuerySchema.parse(req.query);
  const data = await service.getCashierSummary(
    getUserId(req),
    params.propertyId,
    query.from,
    query.to,
  );
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
