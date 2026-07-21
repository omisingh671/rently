import {
  BookingOperationEventType,
  BookingRoomAllocationSource,
  BookingStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  assertComplimentaryUpgradeAllowed,
  assertTransactionalRoomsAvailable,
  buildRoomMovePricingPreview,
  type BookingRoomAssignmentResolution,
} from "./bookings.assignment.js";
import type { DashboardActor } from "./bookings.access.js";
import type { MoveBookingRoomInput } from "./bookings.inputs.js";
import {
  createOperationEvent,
  assertExpectedBookingVersion,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";
import { createRoomMoveAdjustmentCharge } from "./bookings.folio.js";
import { markRoomsDirtyAfterCheckout } from "./bookings.housekeeping.js";
import { mapTransactionBooking } from "./bookings.presenter.js";
import { getVacatedRoomIds } from "./bookings.helper.js";
import { syncCurrentBookingRoomAllocations } from "./bookings.allocations.js";

export const moveBookingRoomsInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actor: DashboardActor;
    roomMove: MoveBookingRoomInput;
    assignment: BookingRoomAssignmentResolution;
    oldRoomIds: string[];
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.roomMove.expectedVersion,
  );
  const pricingPreview = await buildRoomMovePricingPreview(
    booking,
    input.roomMove.roomIds,
    tx,
  );
  if (
    pricingPreview.pricingFingerprint !== input.roomMove.pricingFingerprint ||
    !new Prisma.Decimal(pricingPreview.totalAdjustment).equals(
      input.roomMove.expectedAdjustmentAmount,
    )
  ) {
    throw new HttpError(
      409,
      "PRICING_CHANGED",
      "Room move pricing changed. Review the latest price before confirming.",
    );
  }
  if (!pricingPreview.allowedPricingActions.includes(input.roomMove.pricingAction)) {
    throw new HttpError(
      422,
      "ROOM_MOVE_PRICING_ACTION_INVALID",
      "Selected room move pricing action is not available",
    );
  }
  assertComplimentaryUpgradeAllowed(
    input.actor,
    input.roomMove,
    pricingPreview,
  );
  await assertTransactionalRoomsAvailable(
    tx,
    booking,
    input.roomMove.roomIds,
    booking.status === BookingStatus.CHECKED_IN,
  );
  const pricingUpdatesByItemId = new Map(
    pricingPreview.itemPricingUpdates.map((update) => [update.itemId, update]),
  );
  for (const itemAssignment of input.assignment.assignments) {
    const pricingUpdate = pricingUpdatesByItemId.get(itemAssignment.itemId);
    if (!pricingUpdate) {
      throw new HttpError(
        409,
        "PRICING_CHANGED",
        "Room move pricing changed. Review the latest price before confirming.",
      );
    }
    await tx.bookingItem.update({
      where: { id: itemAssignment.itemId },
      data: {
        ...itemAssignment.data,
        pricingId: pricingUpdate.pricingId,
        pricePerNight: pricingUpdate.pricePerNight,
      },
    });
  }
  await syncCurrentBookingRoomAllocations(tx, {
    bookingId: booking.id,
    actorUserId: input.actor.id,
    effectiveFrom: new Date(`${pricingPreview.effectiveDate}T00:00:00.000Z`),
    source: BookingRoomAllocationSource.ROOM_MOVE,
  });
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.roomMove.expectedVersion,
    {
      ...input.assignment.bookingData,
    },
  );
  const folioCharge = await createRoomMoveAdjustmentCharge(tx, {
    booking,
    actorUserId: input.actor.id,
    roomMove: input.roomMove,
    pricingPreview,
    oldRoomIds: input.oldRoomIds,
  });
  const vacatedRoomIds = getVacatedRoomIds(
    input.oldRoomIds,
    input.roomMove.roomIds,
  );
  if (booking.status === BookingStatus.CHECKED_IN && vacatedRoomIds.length > 0) {
    await markRoomsDirtyAfterCheckout(tx, {
      propertyId: booking.propertyId,
      bookingId: booking.id,
      actorUserId: input.actor.id,
      roomIds: vacatedRoomIds,
      note: `Room vacated during move: ${input.roomMove.note}`,
    });
  }
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actor.id,
    eventType:
      input.oldRoomIds.length > 0
        ? BookingOperationEventType.ROOM_MOVE
        : BookingOperationEventType.ROOM_ASSIGNMENT,
    note: input.roomMove.note,
    metadata: {
      oldRoomIds: input.oldRoomIds,
      newRoomIds: input.roomMove.roomIds,
      pricingAction: input.roomMove.pricingAction,
      pricingFingerprint: pricingPreview.pricingFingerprint,
      currentNightlyRate: pricingPreview.currentNightlyRate,
      destinationNightlyRate: pricingPreview.destinationNightlyRate,
      affectedNights: pricingPreview.affectedNights,
      effectiveDate: pricingPreview.effectiveDate,
      baseDifference: pricingPreview.baseDifference,
      taxDifference: pricingPreview.taxDifference,
      totalAdjustment: pricingPreview.totalAdjustment,
      movementType: pricingPreview.movementType,
      downgradeTreatment: pricingPreview.downgradeTreatment,
      policySnapshot: pricingPreview.policySnapshot,
      waivedAmount:
        input.roomMove.pricingAction === "COMPLIMENTARY_UPGRADE"
          ? pricingPreview.totalAdjustment
          : "0",
      folioChargeId: folioCharge?.id ?? null,
    },
  });

  return mapTransactionBooking(tx, input.bookingId);
};
