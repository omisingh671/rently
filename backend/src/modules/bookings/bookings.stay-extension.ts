import { createHash } from "node:crypto";
import {
  BookingOperationEventType,
  BookingStatus,
  BookingTargetType,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { billingService } from "@/modules/billing/index.js";
import { getInventoryConflictTypes } from "@/modules/public/availability/availability.conflicts.js";
import {
  assertStayExtensionPricingActionAllowed,
  isAdminOverrideRole,
  shouldCreateStayExtensionCharge,
} from "./bookings.helper.js";
import { buildStayExtensionChargePreview } from "./bookings.assignment.js";
import type { DashboardActor } from "./bookings.access.js";
import type { BookingStayExtensionPreviewDTO } from "./bookings.dto.js";
import type {
  CommitStayExtensionInput,
  PreviewStayExtensionInput,
} from "./bookings.inputs.js";
import {
  assertExpectedBookingVersion,
  createOperationEvent,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";
import { mapBooking } from "./bookings.mapper.js";
import { mapTransactionBooking } from "./bookings.presenter.js";
import type * as repo from "./bookings.repository.js";

const assertStayCanBeExtended = (
  booking: repo.DashboardBookingRecord,
  newCheckOut: Date,
) => {
  if (
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.CHECKED_IN
  ) {
    throw new HttpError(
      409,
      "STAY_EXTENSION_NOT_ALLOWED",
      "Only confirmed or checked-in bookings can be extended",
    );
  }
  if (newCheckOut.getTime() <= booking.checkOut.getTime()) {
    throw new HttpError(
      422,
      "STAY_EXTENSION_DATE_INVALID",
      "New check-out must be after the current check-out date",
    );
  }
};

const getExtensionTargets = (booking: repo.DashboardBookingRecord) => {
  const targets = booking.items.map((item) => {
    if (item.targetType === BookingTargetType.UNIT && item.unitId !== null) {
      return {
        target: {
          targetType: BookingTargetType.UNIT,
          unitId: item.unitId,
          roomId: null,
        },
        targetId: item.unitId,
        targetLabel: item.targetLabel,
      } as const;
    }
    if (
      item.targetType === BookingTargetType.ROOM &&
      item.roomId !== null &&
      item.unitId !== null
    ) {
      return {
        target: {
          targetType: BookingTargetType.ROOM,
          unitId: item.unitId,
          roomId: item.roomId,
        },
        targetId: item.roomId,
        targetLabel: item.targetLabel,
      } as const;
    }
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Every stay item must have assigned inventory before extension",
    );
  });

  return [...new Map(targets.map((entry) => [entry.targetId, entry])).values()];
};

export const buildStayExtensionPreview = async (
  tx: Prisma.TransactionClient,
  booking: repo.DashboardBookingRecord,
  input: PreviewStayExtensionInput,
): Promise<BookingStayExtensionPreviewDTO> => {
  assertExpectedBookingVersion(booking.version, input.expectedVersion);
  assertStayCanBeExtended(booking, input.newCheckOut);

  const targets = getExtensionTargets(booking);
  const conflicts = (
    await Promise.all(
      targets.map(async (entry) => {
        const types = await getInventoryConflictTypes(
          booking.propertyId,
          entry.target,
          { checkIn: booking.checkOut, checkOut: input.newCheckOut },
          tx,
        );
        return types.map((type) => ({
          type,
          targetType: entry.target.targetType,
          targetId: entry.targetId,
          targetLabel: entry.targetLabel,
        }));
      }),
    )
  ).flat();
  const chargePreview = await buildStayExtensionChargePreview(
    booking,
    tx,
    input.newCheckOut,
  );
  if (chargePreview === null) {
    throw new HttpError(
      422,
      "STAY_EXTENSION_DATE_INVALID",
      "New check-out must add at least one night",
    );
  }

  const discountAmount = "0";
  const existingBalance = mapBooking(booking).balanceAmount;
  const resultingBalance = new Prisma.Decimal(existingBalance)
    .plus(chargePreview.totalAmount)
    .toDecimalPlaces(2)
    .toString();
  const fingerprintPayload = {
    bookingId: booking.id,
    bookingVersion: booking.version,
    newCheckOut: input.newCheckOut.toISOString(),
    extraNights: chargePreview.extraNights,
    baseAmount: chargePreview.baseAmount,
    discountAmount,
    taxAmount: chargePreview.taxAmount,
    totalAmount: chargePreview.totalAmount,
    taxBreakdown: chargePreview.taxBreakdown,
    pricingSnapshot: chargePreview.pricingSnapshot,
  };
  const pricingFingerprint = createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex");

  return {
    ...chargePreview,
    bookingId: booking.id,
    bookingVersion: booking.version,
    newCheckOut: input.newCheckOut.toISOString(),
    discountAmount,
    existingBalance,
    resultingBalance,
    pricingFingerprint,
    conflicts,
  };
};

export const commitStayExtension = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actor: DashboardActor;
    extension: CommitStayExtensionInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  const preview = await buildStayExtensionPreview(tx, booking, input.extension);
  if (preview.pricingFingerprint !== input.extension.pricingFingerprint) {
    throw new HttpError(
      409,
      "PRICING_CHANGED",
      "Stay-extension pricing changed. Review the latest preview before confirming.",
    );
  }

  const blockingConflicts = preview.conflicts.filter(
    (conflict) =>
      conflict.type !== "MAINTENANCE" ||
      input.extension.overrideReason === undefined ||
      !isAdminOverrideRole(input.actor.role),
  );
  if (blockingConflicts.length > 0) {
    throw new HttpError(
      409,
      "STAY_EXTENSION_CONFLICT",
      "Assigned inventory is not available for the requested extension",
      { conflicts: blockingConflicts },
    );
  }
  if (
    input.extension.overrideReason !== undefined &&
    !isAdminOverrideRole(input.actor.role)
  ) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only Admin or Super Admin can override maintenance conflicts",
    );
  }
  assertStayExtensionPricingActionAllowed(
    input.extension.pricingAction,
    input.actor.role,
  );

  await updateVersionedBooking(
    tx,
    booking.id,
    input.extension.expectedVersion,
    { checkOut: input.extension.newCheckOut },
  );
  const createsCharge = shouldCreateStayExtensionCharge(
    input.extension.pricingAction,
  );
  const charge = createsCharge
    ? await tx.bookingFolioCharge.create({
        data: {
          bookingId: booking.id,
          propertyId: booking.propertyId,
          createdByUserId: input.actor.id,
          type: "EXTENSION",
          description: `Stay extension: ${preview.extraNights} night${preview.extraNights === 1 ? "" : "s"}`,
          amount: preview.totalAmount,
          note: input.extension.note,
          metadata: {
            source: "STAY_EXTENSION",
            originalCheckOutDate: preview.originalCheckOutDate,
            newCheckOut: preview.newCheckOut,
            addedNights: preview.extraNights,
            baseAmount: preview.baseAmount,
            discountAmount: preview.discountAmount,
            discountPolicy: "ADDITIONAL_NIGHTS_NOT_DISCOUNTED",
            taxAmount: preview.taxAmount,
            totalAmount: preview.totalAmount,
            taxBreakdown: preview.taxBreakdown,
            pricingSnapshot: preview.pricingSnapshot,
            pricingFingerprint: preview.pricingFingerprint,
            ...(input.extension.overrideReason !== undefined && {
              maintenanceOverrideReason: input.extension.overrideReason,
            }),
          },
        },
      })
    : null;
  if (charge) {
    await billingService.createDebitNoteForFolioCharge(
      booking.id,
      charge.id,
      tx,
    );
  }
  await createOperationEvent(tx, {
    bookingId: booking.id,
    propertyId: booking.propertyId,
    actorUserId: input.actor.id,
    eventType: BookingOperationEventType.STAY_EXTENSION,
    note: input.extension.note,
    metadata: {
      originalCheckOutDate: preview.originalCheckOutDate,
      newCheckOut: preview.newCheckOut,
      addedNights: preview.extraNights,
      baseAmount: preview.baseAmount,
      discountAmount: preview.discountAmount,
      taxAmount: preview.taxAmount,
      totalAmount: preview.totalAmount,
      pricingAction: input.extension.pricingAction,
      waivedAmount: createsCharge ? "0" : preview.totalAmount,
      resultingBalance: createsCharge
        ? preview.resultingBalance
        : preview.existingBalance,
      pricingFingerprint: preview.pricingFingerprint,
      folioChargeId: charge?.id ?? null,
      ...(input.extension.overrideReason !== undefined && {
        maintenanceOverrideReason: input.extension.overrideReason,
      }),
    },
  });

  return mapTransactionBooking(tx, booking.id);
};
