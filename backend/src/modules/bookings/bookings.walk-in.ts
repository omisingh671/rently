import { randomUUID } from "node:crypto";
import { prisma } from "@/db/prisma.js";
import {
  BookingTargetType,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { DashboardActor } from "./bookings.access.js";
import type {
  CheckDashboardManualBookingAvailabilityInput,
  CreateDashboardManualBookingInput,
} from "./bookings.inputs.js";
import type { DashboardManualBookingAvailabilityDTO } from "./bookings.dto.js";

type ManualAvailabilityOption = {
  propertyId: string;
  optionId: string;
  title: string;
  guestSplit: string;
  comfortOption: CheckDashboardManualBookingAvailabilityInput["comfortOption"];
  itemCount: number;
  nightlyTotal: { toString(): string };
  stayTotal: { toString(): string };
  totalCapacity: number;
  items: Array<{
    pricingId: string;
    pricePerNight: { toString(): string };
    target: {
      targetType: BookingTargetType;
    };
  }>;
};

export const findOrCreateWalkInGuest = async (
  actor: DashboardActor,
  input: Pick<
    CreateDashboardManualBookingInput,
    "guestName" | "guestEmail" | "countryCode" | "contactNumber"
  >,
) => {
  const email = input.guestEmail.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.role !== UserRole.GUEST) {
      throw new HttpError(
        409,
        "GUEST_EMAIL_UNAVAILABLE",
        "This email belongs to a dashboard user",
      );
    }

    return prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: input.guestName,
        ...(input.countryCode !== undefined &&
          input.contactNumber !== undefined && {
            countryCode: input.countryCode,
            contactNumber: input.contactNumber,
          }),
      },
    });
  }

  const passwordHash = randomUUID();
  return prisma.user.create({
    data: {
      fullName: input.guestName,
      email,
      passwordHash,
      role: UserRole.GUEST,
      createdBy: {
        connect: {
          id: actor.id,
        },
      },
      ...(input.countryCode !== undefined &&
        input.contactNumber !== undefined && {
          countryCode: input.countryCode,
          contactNumber: input.contactNumber,
        }),
    },
  });
};

export const getStayNights = (from: Date, to: Date) =>
  Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );

export const buildManualBookingAvailabilityDTO = (
  propertyId: string,
  input: CheckDashboardManualBookingAvailabilityInput,
  options: ManualAvailabilityOption[],
): DashboardManualBookingAvailabilityDTO => {
  const propertyOptions = options.filter(
    (option) => option.propertyId === propertyId,
  );
  const availableItems = propertyOptions.map((option) => {
    const firstItem = option.items[0];
    const spaceId =
      option.items.length === 1 && firstItem
        ? firstItem.pricingId
        : option.optionId;
    return {
      spaceId,
      bookingOptionId: option.optionId,
      title: option.title,
      guestSplit: option.guestSplit,
      comfortOption: option.comfortOption,
      itemCount: option.itemCount,
      nightlyTotal: option.nightlyTotal.toString(),
      stayTotal: option.stayTotal.toString(),
      available: true,
      capacity: option.totalCapacity,
      targetType:
        option.items.length === 1 && firstItem
          ? firstItem.target.targetType
          : BookingTargetType.ROOM,
      reason: null,
      guestCount: input.guests,
      pricePerNight: option.nightlyTotal.toString(),
      priceBreakup: option.items.map((item) => item.pricePerNight.toString()),
    };
  });
  const requestedSpaceIds = input.spaceIds ?? [];
  const availableItemsBySpaceId = new Map(
    availableItems.map((item) => [item.spaceId, item]),
  );
  const items =
    requestedSpaceIds.length > 0
      ? requestedSpaceIds.map(
          (spaceId): DashboardManualBookingAvailabilityDTO["items"][number] =>
            availableItemsBySpaceId.get(spaceId) ?? {
              spaceId,
              bookingOptionId: spaceId,
              title: "Unavailable space",
              guestSplit: "Unavailable",
              comfortOption: input.comfortOption,
              itemCount: 1,
              nightlyTotal: "0",
              stayTotal: "0",
              available: false,
              capacity: 0,
              targetType: BookingTargetType.ROOM,
              reason: "Already booked for selected dates",
              guestCount: input.guests,
              pricePerNight: null,
              priceBreakup: [],
            },
        )
      : availableItems;

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    guests: input.guests,
    availableSpaceIds: items
      .filter((item) => item.available)
      .map((item) => item.spaceId),
    items,
  };
};
