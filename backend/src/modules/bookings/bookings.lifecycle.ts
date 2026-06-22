import {
  BookingOperationEventType,
  BookingStatus,
  Prisma,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  CheckInBookingInput,
  CheckOutBookingInput,
} from "./bookings.inputs.js";
import {
  assertTransactionalRoomsAvailable,
  getAssignedCheckInRoomIds,
  type BookingRoomAssignmentResolution,
} from "./bookings.assignment.js";
import { getBookingBalanceAmount } from "./bookings.financials.js";
import { markRoomsDirtyAfterCheckout } from "./bookings.housekeeping.js";
import {
  assertBookingTransitionAllowed,
  getLocalDateValue,
  isAdminOverrideRole,
  requireAuditNote,
} from "./bookings.helper.js";
import { mapTransactionBooking } from "./bookings.presenter.js";
import * as repo from "./bookings.repository.js";

export const assertCheckoutBalanceSettled = (input: {
  booking: repo.DashboardBookingRecord;
  actor: { role: UserRole };
  allowBalanceDueCheckout?: boolean;
  note?: string;
}) => {
  const balanceAmount = getBookingBalanceAmount(input.booking);
  if (balanceAmount.greaterThan(0)) {
    if (
      input.allowBalanceDueCheckout !== true ||
      !isAdminOverrideRole(input.actor.role)
    ) {
      throw new HttpError(
        409,
        "CHECK_OUT_BALANCE_DUE",
        "Settle the folio before checkout or use an Admin override",
      );
    }
    requireAuditNote(
      input.note,
      "Override note is required to check out with balance due",
    );
  }

  return {
    balanceAmount,
  };
};

export const assertExpectedBookingVersion = (
  actualVersion: number,
  expectedVersion: number,
) => {
  if (actualVersion !== expectedVersion) {
    throw new HttpError(
      409,
      "BOOKING_VERSION_CONFLICT",
      "Booking was changed by another operator. Reload and try again.",
    );
  }
};

export const updateVersionedBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  expectedVersion: number,
  data: Prisma.BookingUpdateManyMutationInput,
) => {
  const result = await tx.booking.updateMany({
    where: { id: bookingId, version: expectedVersion },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (result.count !== 1) {
    throw new HttpError(
      409,
      "BOOKING_VERSION_CONFLICT",
      "Booking was changed by another operator. Reload and try again.",
    );
  }
};

export const createOperationEvent = (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    propertyId: string;
    actorUserId: string;
    eventType: BookingOperationEventType;
    note?: string;
    metadata?: Prisma.InputJsonValue;
  },
) =>
  tx.bookingOperationEvent.create({
    data: {
      bookingId: input.bookingId,
      propertyId: input.propertyId,
      actorUserId: input.actorUserId,
      eventType: input.eventType,
      ...(input.note !== undefined && { note: input.note }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
    },
  });

export const createStatusHistory = (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    fromStatus: BookingStatus;
    toStatus: BookingStatus;
    actorUserId: string;
    note?: string;
  },
) =>
  tx.bookingStatusHistory.create({
    data: {
      bookingId: input.bookingId,
      fromStatus: input.fromStatus,
      toStatus: input.toStatus,
      actorUserId: input.actorUserId,
      ...(input.note !== undefined && { note: input.note }),
    },
  });

export const findTransactionBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
) => {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: repo.dashboardBookingInclude,
  });
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  return booking;
};

export const checkInBookingInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    checkIn: CheckInBookingInput;
    assignment?: BookingRoomAssignmentResolution;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.checkIn.expectedVersion,
  );
  assertBookingTransitionAllowed(booking.status, BookingStatus.CHECKED_IN);

  const today = getLocalDateValue(new Date(), booking.property.tenant.timezone);
  const arrivalDate = getLocalDateValue(
    booking.checkIn,
    booking.property.tenant.timezone,
  );
  if (today < arrivalDate) {
    throw new HttpError(
      409,
      "CHECK_IN_TOO_EARLY",
      "Guest can be checked in only on or after the check-in date",
    );
  }
  if (today > arrivalDate) {
    requireAuditNote(input.checkIn.note, "Audit note is required for late arrival");
  }

  const selectedRoomIds =
    input.checkIn.roomIds ?? (await getAssignedCheckInRoomIds(tx, booking));
  await assertTransactionalRoomsAvailable(tx, booking, selectedRoomIds, true);

  const balanceAmount = getBookingBalanceAmount(booking);
  if (balanceAmount.greaterThan(0)) {
    if (input.checkIn.allowBalanceDueCheckIn !== true) {
      throw new HttpError(
        409,
        "CHECK_IN_BALANCE_DUE",
        "Record balance payment before check-in or use an audited override",
      );
    }
    requireAuditNote(
      input.checkIn.note,
      "Override note is required to check in with balance due",
    );
  }

  if (input.assignment !== undefined) {
    for (const itemAssignment of input.assignment.assignments) {
      await tx.bookingItem.update({
        where: { id: itemAssignment.itemId },
        data: itemAssignment.data,
      });
    }
  }

  const now = new Date();
  await updateVersionedBooking(tx, input.bookingId, input.checkIn.expectedVersion, {
    status: BookingStatus.CHECKED_IN,
    checkedInAt: now,
    identityVerifiedAt: now,
    ...(input.checkIn.identityDocumentType !== undefined && {
      identityDocumentType: input.checkIn.identityDocumentType,
      identityDocumentReference: input.checkIn.identityDocumentReference,
    }),
    ...(input.assignment !== undefined && input.assignment.bookingData),
  });
  await createStatusHistory(tx, {
    bookingId: input.bookingId,
    fromStatus: booking.status,
    toStatus: BookingStatus.CHECKED_IN,
    actorUserId: input.actorUserId,
    ...(input.checkIn.note !== undefined && { note: input.checkIn.note }),
  });
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.CHECK_IN,
    ...(input.checkIn.note !== undefined && { note: input.checkIn.note }),
    metadata: {
      roomIds: selectedRoomIds,
      identityVerified: true,
      lateArrival: today > arrivalDate,
    },
  });
  if (balanceAmount.greaterThan(0)) {
    await createOperationEvent(tx, {
      bookingId: input.bookingId,
      propertyId: booking.propertyId,
      actorUserId: input.actorUserId,
      eventType: BookingOperationEventType.BALANCE_OVERRIDE,
      ...(input.checkIn.note !== undefined && { note: input.checkIn.note }),
      metadata: {
        balanceAmount: balanceAmount.toString(),
        stage: "CHECK_IN",
      },
    });
  }

  return mapTransactionBooking(tx, input.bookingId);
};

export const checkOutBookingInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actor: {
      id: string;
      role: UserRole;
    };
    checkOut: CheckOutBookingInput;
    extensionChargeId: string | null;
    extraNights: number;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.checkOut.expectedVersion,
  );
  assertBookingTransitionAllowed(booking.status, BookingStatus.CHECKED_OUT);
  const { balanceAmount } = assertCheckoutBalanceSettled({
    booking,
    actor: input.actor,
    ...(input.checkOut.allowBalanceDueCheckout !== undefined && {
      allowBalanceDueCheckout: input.checkOut.allowBalanceDueCheckout,
    }),
    ...(input.checkOut.note !== undefined && { note: input.checkOut.note }),
  });

  const roomIds = booking.items
    .map((item) => item.roomId)
    .filter((roomId): roomId is string => roomId !== null);
  await updateVersionedBooking(tx, input.bookingId, input.checkOut.expectedVersion, {
    status: BookingStatus.CHECKED_OUT,
    checkedOutAt: new Date(),
  });
  await markRoomsDirtyAfterCheckout(tx, {
    propertyId: booking.propertyId,
    bookingId: input.bookingId,
    actorUserId: input.actor.id,
    roomIds,
    ...(input.checkOut.note !== undefined && { note: input.checkOut.note }),
  });
  await createStatusHistory(tx, {
    bookingId: input.bookingId,
    fromStatus: booking.status,
    toStatus: BookingStatus.CHECKED_OUT,
    actorUserId: input.actor.id,
    ...(input.checkOut.note !== undefined && { note: input.checkOut.note }),
  });
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actor.id,
    eventType: BookingOperationEventType.CHECK_OUT,
    ...(input.checkOut.note !== undefined && { note: input.checkOut.note }),
    metadata: {
      roomIds,
      balanceAmount: balanceAmount.toString(),
      extensionChargeId: input.extensionChargeId,
      extraNights: input.extraNights,
    },
  });
  if (balanceAmount.greaterThan(0)) {
    await createOperationEvent(tx, {
      bookingId: input.bookingId,
      propertyId: booking.propertyId,
      actorUserId: input.actor.id,
      eventType: BookingOperationEventType.BALANCE_OVERRIDE,
      ...(input.checkOut.note !== undefined && { note: input.checkOut.note }),
      metadata: {
        balanceAmount: balanceAmount.toString(),
        stage: "CHECK_OUT",
        extensionChargeId: input.extensionChargeId,
      },
    });
  }

  return mapTransactionBooking(tx, input.bookingId);
};
