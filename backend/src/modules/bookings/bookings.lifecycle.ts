import {
  BookingOperationEventType,
  BookingRefundRequestStatus,
  BookingStatus,
  Prisma,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  CheckInBookingInput,
  CheckOutBookingInput,
  CorrectBookingStatusInput,
  NoShowBookingInput,
  UpdateDashboardBookingInput,
} from "./bookings.inputs.js";
import {
  assertBookingHasAssignedTarget,
  assertTransactionalRoomsAvailable,
  getAssignedCheckInRoomIds,
  type BookingRoomAssignmentResolution,
} from "./bookings.assignment.js";
import { getBookingBalanceAmount } from "./bookings.financials.js";
import { markRoomsDirtyAfterCheckout } from "./bookings.housekeeping.js";
import {
  assertBookingLifecycleDateAllowed,
  assertBookingTransitionAllowed,
  getLocalDateValue,
  isAdminOverrideRole,
  requireAuditNote,
} from "./bookings.helper.js";
import { isBookingNoShowEligible } from "./bookings.mapper.js";
import {
  mapDashboardBooking,
  mapTransactionBooking,
} from "./bookings.presenter.js";
import * as repo from "./bookings.repository.js";
import {
  buildCheckInPolicyPreview,
  buildCheckOutPolicyPreview,
} from "./bookings.stay-policy.js";

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

export const assertDashboardBookingStatusUpdateAllowed = (
  booking: repo.DashboardBookingRecord,
  actor: { role: UserRole },
  input: UpdateDashboardBookingInput,
) => {
  const nextStatus = input.status;
  const statusOverride = input.statusOverride === true;
  const statusChanged =
    nextStatus !== undefined && nextStatus !== booking.status;

  if (!statusChanged || nextStatus === undefined) {
    return {
      nextStatus,
      statusChanged,
      statusOverride,
    };
  }

  if (statusOverride) {
    if (!isAdminOverrideRole(actor.role)) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Only Admin or Super Admin can correct booking status",
      );
    }

    requireAuditNote(
      input.note,
      "Audit note is required for status correction",
    );

    return {
      nextStatus,
      statusChanged,
      statusOverride,
    };
  }

  assertBookingTransitionAllowed(booking.status, nextStatus);

  if (nextStatus === BookingStatus.CHECKED_IN) {
    assertBookingHasAssignedTarget(booking);
    assertBookingLifecycleDateAllowed(booking, nextStatus);
    const balanceAmount = getBookingBalanceAmount(booking);

    if (balanceAmount.greaterThan(0)) {
      if (input.allowBalanceDueCheckIn !== true) {
        throw new HttpError(
          409,
          "CHECK_IN_BALANCE_DUE",
          "Record balance payment before check-in or add an override note",
        );
      }

      requireAuditNote(
        input.note,
        "Override note is required to check in with balance due",
      );
    }
  }

  if (nextStatus === BookingStatus.CANCELLED) {
    if (
      booking.status === BookingStatus.CHECKED_IN &&
      !isAdminOverrideRole(actor.role)
    ) {
      throw new HttpError(
        403,
        "CHECKED_IN_CANCELLATION_RESTRICTED",
        "Only Admin or Super Admin can cancel after check-in",
      );
    }

    if (actor.role === UserRole.MANAGER) {
      requireAuditNote(
        input.note,
        "Cancellation note is required for manager cancellation",
      );
    }
  }

  if (nextStatus === BookingStatus.NO_SHOW) {
    requireAuditNote(input.note, "No-show note is required");
    if (!isBookingNoShowEligible(booking)) {
      throw new HttpError(
        409,
        "NO_SHOW_NOT_ELIGIBLE",
        "Booking is not eligible for no-show yet",
      );
    }
  }

  if (nextStatus === BookingStatus.CHECKED_OUT) {
    assertBookingLifecycleDateAllowed(booking, nextStatus);
  }

  return {
    nextStatus,
    statusChanged,
    statusOverride,
  };
};

export const checkInBookingInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    actorRole: UserRole;
    checkIn: CheckInBookingInput;
    assignment?: BookingRoomAssignmentResolution;
  },
) => {
  let booking = await findTransactionBooking(tx, input.bookingId);
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

  const policyPreview = await buildCheckInPolicyPreview(tx, booking);
  const policyOverride = input.checkIn.allowPolicyOverride === true;
  if (policyPreview.isEarly && (!policyPreview.allowed || policyPreview.feeAmount !== "0")) {
    if (!input.checkIn.policyFingerprint) {
      throw new HttpError(
        409,
        "POLICY_PREVIEW_REQUIRED",
        "Review the early check-in policy before confirming",
      );
    }
    if (input.checkIn.policyFingerprint !== policyPreview.policyFingerprint) {
      throw new HttpError(
        409,
        "POLICY_CHANGED",
        "The property policy changed. Review the latest result.",
      );
    }
  }
  if (policyPreview.isEarly && !policyPreview.allowed && !policyOverride) {
    throw new HttpError(409, "EARLY_CHECK_IN_NOT_ALLOWED", "Early check-in is disabled by property policy");
  }
  if (policyOverride) {
    if (!isAdminOverrideRole(input.actorRole)) {
      throw new HttpError(403, "POLICY_OVERRIDE_RESTRICTED", "Only Admin or Super Admin can override stay policy");
    }
    requireAuditNote(input.checkIn.overrideReason, "Policy override reason is required");
  }
  if (policyPreview.isEarly && policyPreview.feeAmount !== "0" && !policyOverride) {
    await tx.bookingFolioCharge.create({
      data: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        createdByUserId: input.actorUserId,
        type: "ADJUSTMENT",
        description: "Early check-in fee",
        amount: policyPreview.feeAmount,
        metadata: {
          source: "EARLY_CHECK_IN_POLICY",
          policyFingerprint: policyPreview.policyFingerprint,
          policySnapshot: policyPreview.policySnapshot,
        },
      },
    });
    booking = await findTransactionBooking(tx, input.bookingId);
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
      earlyCheckIn: policyPreview.isEarly,
      earlyCheckInFee: policyOverride ? "0" : policyPreview.feeAmount,
      policyOverride,
      policyFingerprint: policyPreview.policyFingerprint,
      policySnapshot: policyPreview.policySnapshot,
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

export const updateDashboardBookingLifecycle = async (input: {
  booking: repo.DashboardBookingRecord;
  actorUserId: string;
  update: UpdateDashboardBookingInput;
  assignment?: BookingRoomAssignmentResolution;
  nextStatus: BookingStatus | undefined;
  statusChanged: boolean;
  statusOverride: boolean;
}) => {
  const updatedBooking = await repo.updateBookingLifecycleById(
    input.booking.id,
    {
      ...(input.update.status !== undefined && { status: input.update.status }),
      ...(input.update.status === BookingStatus.CANCELLED && {
        cancellationReason: input.update.note ?? "Cancelled from dashboard",
        cancelledAt: new Date(),
      }),
      ...(input.statusOverride &&
        input.statusChanged &&
        input.update.status !== BookingStatus.CANCELLED && {
          cancellationReason: null,
          cancelledAt: null,
        }),
      ...(input.assignment !== undefined && input.assignment.bookingData),
      ...(input.update.internalNotes !== undefined && {
        internalNotes: input.update.internalNotes,
      }),
    },
    input.statusChanged && input.nextStatus !== undefined
      ? {
          booking: {
            connect: {
              id: input.booking.id,
            },
          },
          fromStatus: input.booking.status,
          toStatus: input.nextStatus,
          actor: {
            connect: {
              id: input.actorUserId,
            },
          },
          ...(input.update.note !== undefined && { note: input.update.note }),
        }
      : undefined,
    input.assignment?.assignments,
  );

  if (
    input.nextStatus === BookingStatus.CONFIRMED ||
    input.nextStatus === BookingStatus.CANCELLED
  ) {
    await repo.releaseInventoryLocksByBooking(updatedBooking.id, new Date());
  }

  return mapDashboardBooking(updatedBooking);
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
  const policyPreview = await buildCheckOutPolicyPreview(tx, booking);
  if (new Prisma.Decimal(policyPreview.refundAmount).greaterThan(0)) {
    if (!input.checkOut.policyFingerprint) {
      throw new HttpError(409, "POLICY_PREVIEW_REQUIRED", "Review the early checkout refund before confirming");
    }
    if (input.checkOut.policyFingerprint !== policyPreview.policyFingerprint) {
      throw new HttpError(409, "POLICY_CHANGED", "The property policy changed. Review the latest result.");
    }
  }
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
      earlyCheckout: policyPreview.isEarly,
      unusedNights: policyPreview.unusedNights,
      refundAmount: policyPreview.refundAmount,
      refundManualReviewRequired: policyPreview.manualReviewRequired,
      policyFingerprint: policyPreview.policyFingerprint,
      policySnapshot: policyPreview.policySnapshot,
    },
  });
  if (
    new Prisma.Decimal(policyPreview.refundAmount).greaterThan(0) &&
    !booking.refundRequests.some(
      (request) =>
        request.status === BookingRefundRequestStatus.REQUESTED ||
        request.status === BookingRefundRequestStatus.IN_REVIEW,
    )
  ) {
    await tx.bookingRefundRequest.create({
      data: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        status: BookingRefundRequestStatus.REQUESTED,
        reason: `Early checkout policy review: ${policyPreview.unusedNights} unused night(s), up to ${policyPreview.refundAmount}`,
      },
    });
  }
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

export const checkOutDashboardBookingUpdateInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actor: {
      id: string;
      role: UserRole;
    };
    update: UpdateDashboardBookingInput;
    extensionChargeId: string | null;
    extraNights: number;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  const policyPreview = await buildCheckOutPolicyPreview(tx, booking);
  const { balanceAmount } = assertCheckoutBalanceSettled({
    booking,
    actor: input.actor,
    ...(input.update.note !== undefined && { note: input.update.note }),
  });

  await tx.booking.update({
    where: { id: input.bookingId },
    data: {
      status: BookingStatus.CHECKED_OUT,
      checkedOutAt: new Date(),
      ...(input.update.internalNotes !== undefined && {
        internalNotes: input.update.internalNotes,
      }),
    },
  });
  await createStatusHistory(tx, {
    bookingId: input.bookingId,
    fromStatus: booking.status,
    toStatus: BookingStatus.CHECKED_OUT,
    actorUserId: input.actor.id,
    ...(input.update.note !== undefined && { note: input.update.note }),
  });
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actor.id,
    eventType: BookingOperationEventType.CHECK_OUT,
    ...(input.update.note !== undefined && { note: input.update.note }),
    metadata: {
      balanceAmount: balanceAmount.toString(),
      extensionChargeId: input.extensionChargeId,
      extraNights: input.extraNights,
      earlyCheckout: policyPreview.isEarly,
      unusedNights: policyPreview.unusedNights,
      refundAmount: policyPreview.refundAmount,
      refundManualReviewRequired: policyPreview.manualReviewRequired,
      policyFingerprint: policyPreview.policyFingerprint,
      policySnapshot: policyPreview.policySnapshot,
    },
  });
  if (
    new Prisma.Decimal(policyPreview.refundAmount).greaterThan(0) &&
    !booking.refundRequests.some(
      (request) =>
        request.status === BookingRefundRequestStatus.REQUESTED ||
        request.status === BookingRefundRequestStatus.IN_REVIEW,
    )
  ) {
    await tx.bookingRefundRequest.create({
      data: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        userId: booking.userId,
        status: BookingRefundRequestStatus.REQUESTED,
        reason: `Early checkout policy review: ${policyPreview.unusedNights} unused night(s), up to ${policyPreview.refundAmount}`,
      },
    });
  }
  if (balanceAmount.greaterThan(0)) {
    await createOperationEvent(tx, {
      bookingId: input.bookingId,
      propertyId: booking.propertyId,
      actorUserId: input.actor.id,
      eventType: BookingOperationEventType.BALANCE_OVERRIDE,
      ...(input.update.note !== undefined && { note: input.update.note }),
      metadata: {
        balanceAmount: balanceAmount.toString(),
        stage: "CHECK_OUT",
        extensionChargeId: input.extensionChargeId,
      },
    });
  }

  return mapTransactionBooking(tx, input.bookingId);
};

export const markBookingNoShowInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    noShow: NoShowBookingInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.noShow.expectedVersion,
  );
  assertBookingTransitionAllowed(booking.status, BookingStatus.NO_SHOW);
  if (!isBookingNoShowEligible(booking)) {
    throw new HttpError(
      409,
      "NO_SHOW_NOT_ELIGIBLE",
      "Booking is not eligible for no-show yet",
    );
  }
  await updateVersionedBooking(tx, input.bookingId, input.noShow.expectedVersion, {
    status: BookingStatus.NO_SHOW,
    noShowAt: new Date(),
  });
  await createStatusHistory(tx, {
    bookingId: input.bookingId,
    fromStatus: booking.status,
    toStatus: BookingStatus.NO_SHOW,
    actorUserId: input.actorUserId,
    note: input.noShow.note,
  });
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.NO_SHOW,
    note: input.noShow.note,
  });

  return mapTransactionBooking(tx, input.bookingId);
};

export const correctBookingStatusInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string;
    correction: CorrectBookingStatusInput;
  },
) => {
  const booking = await findTransactionBooking(tx, input.bookingId);
  assertExpectedBookingVersion(
    booking.version,
    input.correction.expectedVersion,
  );
  await updateVersionedBooking(
    tx,
    input.bookingId,
    input.correction.expectedVersion,
    {
      status: input.correction.status,
      ...(input.correction.status !== BookingStatus.CANCELLED && {
        cancellationReason: null,
        cancelledAt: null,
      }),
    },
  );
  await createStatusHistory(tx, {
    bookingId: input.bookingId,
    fromStatus: booking.status,
    toStatus: input.correction.status,
    actorUserId: input.actorUserId,
    note: input.correction.note,
  });
  await createOperationEvent(tx, {
    bookingId: input.bookingId,
    propertyId: booking.propertyId,
    actorUserId: input.actorUserId,
    eventType: BookingOperationEventType.STATUS_CORRECTION,
    note: input.correction.note,
    metadata: {
      fromStatus: booking.status,
      toStatus: input.correction.status,
    },
  });

  return mapTransactionBooking(tx, input.bookingId);
};
