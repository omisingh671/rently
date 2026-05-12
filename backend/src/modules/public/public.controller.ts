import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as service from "./public.service.js";
import {
  cancelBookingSchema,
  checkAvailabilitySchema,
  createBookingSchema,
  createEnquirySchema,
  idParamsSchema,
} from "./public.schema.js";

const resolveTenantInput = (req: AuthRequest) => {
  const querySlug =
    typeof req.query.tenantSlug === "string" ? req.query.tenantSlug : undefined;
  const headerSlug =
    typeof req.headers["x-tenant-slug"] === "string"
      ? req.headers["x-tenant-slug"]
      : typeof req.headers["x-app-name"] === "string"
        ? req.headers["x-app-name"]
        : undefined;

  const tenantSlug = querySlug ?? headerSlug;
  return {
    ...(tenantSlug !== undefined ? { tenantSlug } : {}),
    ...(req.headers.host !== undefined ? { host: req.headers.host } : {}),
  };
};

const getUserId = (req: AuthRequest) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new HttpError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return userId;
};

export const getTenantConfig = async (req: AuthRequest, res: Response) => {
  const data = await service.getTenantConfig(resolveTenantInput(req));
  res.json({ success: true, data });
};

export const listSpaces = async (req: AuthRequest, res: Response) => {
  const data = await service.listSpaces(resolveTenantInput(req));
  res.json({ success: true, data });
};

export const getSpaceById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getSpaceById(params.id, resolveTenantInput(req));
  res.json({ success: true, data });
};

export const checkAvailability = async (req: AuthRequest, res: Response) => {
  const body = checkAvailabilitySchema.parse(req.body);
  const data = await service.checkAvailability(
    {
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      occupancyType: body.occupancyType,
    },
    resolveTenantInput(req),
  );

  res.json({ success: true, data });
};

export const createBooking = async (req: AuthRequest, res: Response) => {
  const body = createBookingSchema.parse(req.body);
  const data = await service.createBooking(
    getUserId(req),
    {
      bookingType: body.bookingType,
      ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
      ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
      from: body.from,
      to: body.to,
      guests: body.guests,
    },
    resolveTenantInput(req),
  );

  res.status(201).json({ success: true, data });
};

export const listBookings = async (req: AuthRequest, res: Response) => {
  const data = await service.listBookings(getUserId(req));
  res.json({ success: true, data });
};

export const getBookingById = async (req: AuthRequest, res: Response) => {
  const params = idParamsSchema.parse(req.params);
  const data = await service.getBookingById(getUserId(req), params.id);
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

export const createEnquiry = async (req: AuthRequest, res: Response) => {
  const body = createEnquirySchema.parse(req.body);
  const tenant = await service.resolveTenant(resolveTenantInput(req));
  const data = await service.createEnquiry({
    tenantId: tenant.id,
    ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
    name: body.name,
    email: body.email,
    contactNumber: body.contactNumber,
    message: body.message,
    ...(body.source !== undefined && { source: body.source }),
  });

  res.status(201).json({ success: true, data });
};
