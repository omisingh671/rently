import {
  BookingOperationEventType,
  BookingStatus,
  FolioChargeStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  CreateBookingFolioChargeInput,
  VoidBookingFolioChargeInput,
} from "./bookings.inputs.js";
import {
  assertExpectedBookingVersion,
  createOperationEvent,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";

export const createBookingFolioChargeInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    charge: CreateBookingFolioChargeInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.charge.expectedVersion,
  );
  if (
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    throw new HttpError(
      409,
      "FOLIO_CLOSED",
      "Charges cannot be added to a cancelled or no-show booking",
    );
  }
  const charge = await tx.bookingFolioCharge.create({
    data: {
      bookingId: input.bookingId,
      propertyId: booking.propertyId,
      createdByUserId: input.actorUserId,
      type: input.charge.type,
      description: input.charge.description,
      amount: input.charge.amount,
      ...(input.charge.note !== undefined && { note: input.charge.note }),
    },
  });
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.charge.expectedVersion,
    {},
  );
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.FOLIO_CHARGE,
    ...(input.charge.note !== undefined && { note: input.charge.note }),
    metadata: {
      chargeId: charge.id,
      type: input.charge.type,
      amount: input.charge.amount,
      description: input.charge.description,
    },
  });
};

export const voidBookingFolioChargeInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    chargeId: string;
    actorUserId: string;
    voidCharge: VoidBookingFolioChargeInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.voidCharge.expectedVersion,
  );
  const charge = await tx.bookingFolioCharge.findFirst({
    where: {
      id: input.chargeId,
      bookingId: input.bookingId,
      status: FolioChargeStatus.ACTIVE,
    },
  });
  if (!charge) {
    throw new HttpError(
      404,
      "FOLIO_CHARGE_NOT_FOUND",
      "Active folio charge not found",
    );
  }
  await tx.bookingFolioCharge.update({
    where: { id: input.chargeId },
    data: {
      status: FolioChargeStatus.VOID,
      voidReason: input.voidCharge.reason,
      voidedAt: new Date(),
      voidedByUserId: input.actorUserId,
    },
  });
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.voidCharge.expectedVersion,
    {},
  );
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.FOLIO_CHARGE_VOID,
    note: input.voidCharge.reason,
    metadata: { chargeId: input.chargeId, amount: charge.amount.toString() },
  });
};
