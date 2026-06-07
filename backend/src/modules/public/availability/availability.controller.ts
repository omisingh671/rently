import type { Response } from "express";
import type { AuthRequest } from "@/common/middleware/auth.middleware.js";
import { resolveTenantInput } from "@/modules/public/tenant/tenant.controller.js";
import * as service from "./availability.service.js";
import {
  checkAvailabilitySchema,
  createInventoryLockSchema,
} from "./availability.schema.js";

export const checkAvailability = async (req: AuthRequest, res: Response) => {
  const body = checkAvailabilitySchema.parse(req.body);
  const data = await service.checkAvailability(
    {
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      comfortOption: body.comfortOption,
      ...(body.city !== undefined && { city: body.city }),
    },
    resolveTenantInput(req),
  );

  res.json({ success: true, data });
};

export const createInventoryLock = async (
  req: AuthRequest,
  res: Response,
) => {
  const body = createInventoryLockSchema.parse(req.body);
  const data = await service.createInventoryLock(
    req.user?.userId,
    {
      bookingType: body.bookingType,
      ...(body.bookingOptionId !== undefined && {
        bookingOptionId: body.bookingOptionId,
      }),
      ...(body.propertyId !== undefined && { propertyId: body.propertyId }),
      ...(body.spaceId !== undefined && { spaceId: body.spaceId }),
      ...(body.spaceIds !== undefined && { spaceIds: body.spaceIds }),
      from: body.from,
      to: body.to,
      guests: body.guests,
      comfortOption: body.comfortOption,
    },
    resolveTenantInput(req),
  );

  res.status(201).json({ success: true, data });
};
