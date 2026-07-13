import { HttpError } from "@/common/errors/http-error.js";
import type { Prisma } from "@/generated/prisma/client.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import * as repo from "./availability.repository.js";

export interface AvailabilityDateRange {
  checkIn: Date;
  checkOut: Date;
}

export const hasInventoryConflict = async (
  propertyId: string,
  target: spacesRepo.PublicSpaceTarget,
  dateRange: AvailabilityDateRange,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const at = new Date();
  const [hasBooking, hasMaintenance, hasLock] = await Promise.all([
    repo.hasOverlappingBooking(
      target,
      dateRange.checkIn,
      dateRange.checkOut,
      tx,
    ),
    repo.hasOverlappingMaintenance(
      propertyId,
      target,
      dateRange.checkIn,
      dateRange.checkOut,
      tx,
    ),
    repo.hasOverlappingInventoryLock(
      target,
      dateRange.checkIn,
      dateRange.checkOut,
      at,
      tx,
      ignoreLockToken,
    ),
  ]);

  return hasBooking || hasMaintenance || hasLock;
};

export const ensureSpaceAvailable = async (
  space: spacesRepo.PublicSpaceRecord,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const target = spacesService.getSpaceTarget(space);
  const unit = space.unit ?? space.room?.unit;

  if (unit && (!unit.isActive || unit.status !== "ACTIVE")) {
    throw new HttpError(
      409,
      "UNIT_DISABLED",
      "The parent unit for this space is currently disabled or inactive",
    );
  }

  const hasConflict = await hasInventoryConflict(
    space.propertyId,
    target,
    { checkIn, checkOut },
    tx,
    ignoreLockToken,
  );

  if (hasConflict) {
    throw new HttpError(
      409,
      "SPACE_NOT_AVAILABLE",
      "Selected space is not available for these dates",
    );
  }

  return target;
};
