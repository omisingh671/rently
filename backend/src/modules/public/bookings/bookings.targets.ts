import {
  BookingTargetType,
  ComfortOption,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { prisma } from "@/db/prisma.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";

const now = () => new Date();

export const getOptionPropertyScope = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
): spacesRepo.PublicPropertyScope => {
  const propertyId = baseScope.propertyId ?? requestedPropertyId;
  return propertyId === undefined ? baseScope : { ...baseScope, propertyId };
};

export const getRequiredPropertyId = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
) => baseScope.propertyId ?? requestedPropertyId;

export const getTargetKey = (target: spacesRepo.PublicSpaceTarget) =>
  target.targetType === BookingTargetType.ROOM
    ? `ROOM:${target.roomId ?? ""}`
    : `UNIT:${target.unitId ?? ""}`;

export const assertInventoryLockCoversTargets = async (
  lockToken: string | undefined,
  targets: spacesRepo.PublicSpaceTarget[],
  checkIn: Date,
  checkOut: Date,
  _tx: Prisma.TransactionClient,
) => {
  if (lockToken === undefined) {
    return;
  }

  const locks = await prisma.inventoryLock.findMany({
    where: {
      lockToken,
      releasedAt: null,
      expiresAt: { gt: now() },
    },
    orderBy: { createdAt: "asc" },
  });
  const expectedKeys = new Set(targets.map(getTargetKey));
  const matchingKeys = new Set(
    locks
      .filter(
        (lock) =>
          lock.checkIn.getTime() === checkIn.getTime() &&
          lock.checkOut.getTime() === checkOut.getTime(),
      )
      .map((lock) =>
        getTargetKey({
          targetType: lock.targetType,
          unitId: lock.unitId,
          roomId: lock.roomId,
        }),
      ),
  );

  if (
    expectedKeys.size !== targets.length ||
    expectedKeys.size !== matchingKeys.size ||
    [...expectedKeys].some((key) => !matchingKeys.has(key))
  ) {
    throw new HttpError(
      409,
      "INVENTORY_LOCK_INVALID",
      "Checkout hold is expired or does not match the selected spaces",
    );
  }
};

export const allocateGuestsAcrossRooms = (
  spaces: spacesRepo.PublicSpaceRecord[],
  totalGuests: number,
) => {
  if (spaces.length > totalGuests) {
    throw new HttpError(
      422,
      "TOO_MANY_ROOMS_FOR_GUESTS",
      "Each selected room must have at least one guest",
    );
  }

  const allocations = spaces.map((space) => ({
    space,
    guestCount: 1,
    remainingCapacity: Math.max(0, spacesService.getSpaceCapacity(space) - 1),
  }));
  let remainingGuests = totalGuests - allocations.length;

  for (const allocation of allocations) {
    if (remainingGuests === 0) {
      break;
    }

    const additionalGuests = Math.min(
      allocation.remainingCapacity,
      remainingGuests,
    );
    allocation.guestCount += additionalGuests;
    remainingGuests -= additionalGuests;
  }

  if (remainingGuests > 0) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected spaces do not cover the requested guest count",
    );
  }

  return allocations.map(({ space, guestCount }) => ({
    space,
    guestCount,
  }));
};

export const assertComfortAvailableForSpace = (
  space: spacesRepo.PublicSpaceRecord,
  comfortOption: ComfortOption,
) => {
  if (
    comfortOption === ComfortOption.AC &&
    space.roomId !== null &&
    space.room?.hasAC !== true
  ) {
    throw new HttpError(
      422,
      "COMFORT_OPTION_NOT_AVAILABLE",
      "Selected room does not support AC bookings",
    );
  }
};

export const resolvePricedSpace = async (
  space: spacesRepo.PublicSpaceRecord,
  target: spacesRepo.PublicSpaceTarget,
  guestCount: number,
  comfortOption: ComfortOption,
  tenantId: string,
  checkIn: Date,
  checkOut: Date,
  nights: number,
  tx: Prisma.TransactionClient,
  propertyScope: spacesRepo.PublicPropertyScope = {},
) => {
  const capacity = spacesService.getSpaceCapacity(space);

  if (guestCount > capacity) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected room does not cover the assigned guest count",
    );
  }

  assertComfortAvailableForSpace(space, comfortOption);

  const pricedSpace = await spacesRepo.findActivePricingForTarget(
    space.propertyId,
    target,
    now(),
    tenantId,
    {
      guestCount,
      comfortOption,
    },
    {
      checkIn,
      checkOut,
      nights,
    },
    tx,
    propertyScope,
  );

  if (!pricedSpace) {
    throw new HttpError(
      422,
      "PRICE_NOT_CONFIGURED",
      `No active ${comfortOption === ComfortOption.AC ? "AC" : "Non-AC"} price is configured for ${guestCount} guest${guestCount === 1 ? "" : "s"} in the selected room`,
    );
  }

  return pricedSpace;
};

export const getArrayItem = <T>(
  items: T[],
  index: number,
  message: string,
): T => {
  const item = items[index];
  if (item === undefined) {
    throw new HttpError(500, "BOOKING_INVARIANT_FAILED", message);
  }

  return item;
};
