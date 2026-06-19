import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingStatus,
  BookingTargetType,
  BookingOperationEventType,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
  RoomHousekeepingStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { createBookingForUser } from "@/modules/public/bookings/bookings.service.js";
import { generateAvailabilityOptions } from "@/modules/public/availability/availability.service.js";
import { billingService } from "@/modules/billing/index.js";
import * as repo from "./bookings.repository.js";

import { buildDashboardRoomBoard } from "./bookings-room-board.mapper.js";
import { isBookingNoShowEligible } from "./bookings.mapper.js";
import {
  assertBookingLifecycleDateAllowed,
  assertBookingTransitionAllowed,
  isAdminOverrideRole,
  requireAuditNote,
  getLocalDateValue,
} from "./bookings.helper.js";
import { getBookingBalanceAmount } from "./bookings.financials.js";
import {
  assertBookingHasAssignedTarget,
  assertTransactionalRoomsAvailable,
  buildLateCheckoutExtensionPreview,
  buildRoomMovePricingPreview,
  getAssignedCheckInRoomIds,
  resolveBookingRoomAssignments,
} from "./bookings.assignment.js";
import {
  assertExpectedBookingVersion,
  createOperationEvent,
  createStatusHistory,
  findTransactionBooking,
  updateVersionedBooking,
} from "./bookings.lifecycle.js";
import {
  buildCashierSummaryPayload,
  buildOperationsBoardPayload,
  getCashierRefundActorIds,
  toBusinessDateBoundary,
} from "./bookings.operations.js";
import {
  createBookingFolioChargeInTransaction,
  ensureLateCheckoutExtensionCharge,
  voidBookingFolioChargeInTransaction,
} from "./bookings.folio.js";
import {
  recordBookingBalancePaymentForBooking,
  recordBookingRefundForBooking,
  updateRefundRequestForBooking,
} from "./bookings.payments.js";
import { updateRoomHousekeepingInTransaction } from "./bookings.housekeeping.js";
import {
  mapDashboardBooking,
  mapDashboardBookings,
  mapTransactionBooking,
} from "./bookings.presenter.js";
import {
  assertPropertyInScope,
  assertRole,
  ensureBookingExists,
  ensurePropertyExists,
  getActor,
  getPropertyScope,
  type DashboardActor,
  type DashboardPropertyScope,
} from "./bookings.access.js";
import {
  findOrCreateWalkInGuest,
  getStayNights,
} from "./bookings.walk-in.js";

import type {
  CheckDashboardManualBookingAvailabilityInput,
  CreateDashboardManualBookingInput,
  DashboardBookingListInput,
  DashboardRoomBoardInput,
  CheckInBookingInput,
  CheckOutBookingInput,
  CorrectBookingStatusInput,
  CreateBookingFolioChargeInput,
  MoveBookingRoomInput,
  PreviewBookingRoomMoveInput,
  NoShowBookingInput,
  RecordDashboardBookingPaymentInput,
  RecordDashboardBookingRefundInput,
  UpdateRoomHousekeepingInput,
  UpdateDashboardBookingInput,
  UpdateDashboardRefundRequestInput,
  VoidBookingFolioChargeInput,
} from "./bookings.inputs.js";

import type {
  DashboardBookingDTO,
  DashboardManualBookingAvailabilityDTO,
  DashboardRoomBoardDTO,
  BookingRoomMovePreviewDTO,
} from "./bookings.dto.js";

export {
  ensurePropertyExists,
  getActor,
  getPropertyScope,
  type DashboardActor,
  type DashboardPropertyScope,
};

const hasExistingAssignment = (booking: repo.DashboardBookingRecord) =>
  booking.roomId !== null ||
  booking.unitId !== null ||
  booking.items.some((item) => item.roomId !== null || item.unitId !== null);

const assertComplimentaryUpgradeAllowed = (
  actor: DashboardActor,
  input: MoveBookingRoomInput,
  pricingPreview: BookingRoomMovePreviewDTO,
) => {
  if (
    input.pricingAction !== "COMPLIMENTARY_UPGRADE" ||
    !pricingPreview.pricingRequired
  ) {
    return;
  }

  if (!isAdminOverrideRole(actor.role)) {
    throw new HttpError(
      403,
      "ROOM_MOVE_WAIVER_RESTRICTED",
      "Only Admin or Super Admin can waive a higher-priced room move",
    );
  }

  requireAuditNote(
    input.note,
    "Audit note is required to waive a higher-priced room move",
  );
};

const postLateCheckoutExtensionCharge = async (
  bookingId: string,
  actor: DashboardActor,
  input: {
    expectedVersion?: number;
    note?: string;
  },
) =>
  repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    if (input.expectedVersion !== undefined) {
      assertExpectedBookingVersion(booking.version, input.expectedVersion);
    }
    if (booking.status !== BookingStatus.CHECKED_IN) {
      return {
        extensionChargeId: null,
        extensionPreview: null,
      };
    }
    const extensionPreview = await buildLateCheckoutExtensionPreview(booking, tx);
    const extensionCharge = await ensureLateCheckoutExtensionCharge(tx, {
      booking,
      actorUserId: actor.id,
      preview: extensionPreview,
      ...(input.note !== undefined && { note: input.note }),
    });
    if (extensionCharge !== null) {
      await billingService.createDebitNoteForFolioCharge(
        booking.id,
        extensionCharge.id,
        tx,
      );
    }

    return {
      extensionChargeId: extensionCharge?.id ?? null,
      extensionPreview,
    };
  });

const assertCheckoutBalanceSettled = (
  input: {
    booking: repo.DashboardBookingRecord;
    actor: DashboardActor;
    allowBalanceDueCheckout?: boolean;
    note?: string;
    extensionChargeId?: string | null;
    extensionPreview?: Awaited<
      ReturnType<typeof postLateCheckoutExtensionCharge>
    >["extensionPreview"];
  },
) => {
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

export const getRoomBoard = async (
  userId: string,
  propertyId: string,
  input: DashboardRoomBoardInput,
): Promise<DashboardRoomBoardDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  const [rooms, bookingItems, maintenanceBlocks] = await Promise.all([
    repo.listRoomBoardRooms(propertyId),
    repo.listRoomBoardBookingItems(propertyId, input.from, input.to),
    repo.listRoomBoardMaintenanceBlocks(propertyId, input.from, input.to),
  ]);

  return buildDashboardRoomBoard({
    propertyId,
    propertyName: property.name,
    from: input.from,
    to: input.to,
    rooms,
    bookingItems,
    maintenanceBlocks,
  });
};

export const listBookings = async (
  userId: string,
  filters: DashboardBookingListInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, filters.propertyId);

  const { items, total } = await repo.listBookingsPaginated(filters);

  // Pagination helper
  const buildPagination = (page: number, limit: number, total: number) => ({
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  });

  return {
    items: await mapDashboardBookings(items),
    pagination: buildPagination(filters.page, filters.limit, total),
  };
};

export const getBookingById = async (
  userId: string,
  bookingId: string,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  return mapDashboardBooking(booking);
};

export const checkManualBookingAvailability = async (
  userId: string,
  propertyId: string,
  input: CheckDashboardManualBookingAvailabilityInput,
): Promise<DashboardManualBookingAvailabilityDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  const nights = getStayNights(input.from, input.to);
  const options = await generateAvailabilityOptions(
    {
      checkIn: input.from,
      checkOut: input.to,
      guests: input.guests,
      comfortOption: input.comfortOption,
    },
    property.tenantId,
    nights,
    { propertyId },
    undefined,
    undefined,
    { pricePrivateRoomsByCapacity: false },
  );
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

export const createManualBooking = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardManualBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  const guest = await findOrCreateWalkInGuest(actor, input);

  const createdBooking = await createBookingForUser(
    guest.id,
    {
      bookingType: input.bookingType,
      ...(input.bookingOptionId !== undefined && {
        bookingOptionId: input.bookingOptionId,
        propertyId,
      }),
      ...(input.spaceId !== undefined && { spaceId: input.spaceId }),
      ...(input.spaceIds !== undefined && { spaceIds: input.spaceIds }),
      from: input.from,
      to: input.to,
      guests: input.guests,
      comfortOption: input.comfortOption,
      couponCode: input.couponCode,
    },
    {
      tenantId: property.tenantId,
    },
    {
      actorUserId: actor.id,
      requiredPropertyId: propertyId,
      paymentPolicy: BookingPaymentPolicy.NO_UPFRONT_PAYMENT,
      upfrontAmount: 0,
      initialStatus: BookingStatus.CONFIRMED,
      statusHistoryNote: "Manual walk-in booking created from dashboard",
      internalNotes: input.internalNotes ?? null,
    },
  );

  const booking = await repo.findBookingById(createdBooking.id);
  if (!booking) {
    throw new HttpError(
      500,
      "BOOKING_READ_FAILED",
      "Booking was created but could not be loaded",
    );
  }

  return mapDashboardBooking(booking);
};

export const updateBooking = async (
  userId: string,
  bookingId: string,
  input: UpdateDashboardBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  const nextStatus = input.status;
  const statusOverride = input.statusOverride === true;
  const statusChanged =
    nextStatus !== undefined && nextStatus !== booking.status;

  if (statusChanged && nextStatus !== undefined) {
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
    } else {
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
    }
  }

  if (input.roomId !== undefined && input.roomIds !== undefined) {
    throw new HttpError(
      422,
      "AMBIGUOUS_ROOM_ASSIGNMENT",
      "Provide either roomId or roomIds, not both",
    );
  }

  const roomIds =
    input.roomIds ?? (input.roomId !== undefined ? [input.roomId] : undefined);
  if (roomIds !== undefined && hasExistingAssignment(booking)) {
    throw new HttpError(
      409,
      "PRICED_ROOM_MOVE_REQUIRED",
      "Use the priced room move flow to change an existing room assignment",
    );
  }
  const assignment =
    roomIds !== undefined
      ? await resolveBookingRoomAssignments(booking, roomIds)
      : undefined;

  if (
    assignment !== undefined &&
    booking.status === BookingStatus.CHECKED_IN &&
    actor.role === UserRole.MANAGER
  ) {
    requireAuditNote(
      input.note,
      "Room-change note is required after check-in",
    );
  }

  if (
    statusChanged &&
    nextStatus === BookingStatus.CHECKED_OUT &&
    statusOverride !== true
  ) {
    const extension = await postLateCheckoutExtensionCharge(bookingId, actor, {
      ...(input.note !== undefined && { note: input.note }),
    });
    const updatedBooking = await repo.runBookingTransaction(async (tx) => {
      const checkoutBooking = await findTransactionBooking(tx, bookingId);
      const { balanceAmount } = assertCheckoutBalanceSettled({
        booking: checkoutBooking,
        actor,
        ...(input.note !== undefined && { note: input.note }),
        extensionChargeId: extension.extensionChargeId,
        extensionPreview: extension.extensionPreview,
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CHECKED_OUT,
          checkedOutAt: new Date(),
          ...(input.internalNotes !== undefined && {
            internalNotes: input.internalNotes,
          }),
        },
      });
      await createStatusHistory(tx, {
        bookingId,
        fromStatus: checkoutBooking.status,
        toStatus: BookingStatus.CHECKED_OUT,
        actorUserId: actor.id,
        ...(input.note !== undefined && { note: input.note }),
      });
      await createOperationEvent(tx, {
        bookingId,
        propertyId: checkoutBooking.propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.CHECK_OUT,
        ...(input.note !== undefined && { note: input.note }),
        metadata: {
          balanceAmount: balanceAmount.toString(),
          extensionChargeId: extension.extensionChargeId,
          extraNights: extension.extensionPreview?.extraNights ?? 0,
        },
      });
      if (balanceAmount.greaterThan(0)) {
        await createOperationEvent(tx, {
          bookingId,
          propertyId: checkoutBooking.propertyId,
          actorUserId: actor.id,
          eventType: BookingOperationEventType.BALANCE_OVERRIDE,
          ...(input.note !== undefined && { note: input.note }),
          metadata: {
            balanceAmount: balanceAmount.toString(),
            stage: "CHECK_OUT",
            extensionChargeId: extension.extensionChargeId,
          },
        });
      }

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: repo.dashboardBookingInclude,
      });
    });

    return mapDashboardBooking(updatedBooking);
  }

  const updatedBooking = await repo.updateBookingLifecycleById(
    bookingId,
    {
      ...(input.status !== undefined && { status: input.status }),
      ...(input.status === BookingStatus.CANCELLED && {
        cancellationReason: input.note ?? "Cancelled from dashboard",
        cancelledAt: new Date(),
      }),
      ...(statusOverride &&
        statusChanged &&
        input.status !== BookingStatus.CANCELLED && {
          cancellationReason: null,
          cancelledAt: null,
        }),
      ...(assignment !== undefined && assignment.bookingData),
      ...(input.internalNotes !== undefined && {
        internalNotes: input.internalNotes,
      }),
    },
    statusChanged && nextStatus !== undefined
      ? {
          booking: {
            connect: {
              id: bookingId,
            },
          },
          fromStatus: booking.status,
          toStatus: nextStatus,
          actor: {
            connect: {
              id: actor.id,
            },
          },
          ...(input.note !== undefined && { note: input.note }),
        }
      : undefined,
    assignment?.assignments,
  );

  if (
    nextStatus === BookingStatus.CONFIRMED ||
    nextStatus === BookingStatus.CANCELLED
  ) {
    await repo.releaseInventoryLocksByBooking(updatedBooking.id, new Date());
  }

  return mapDashboardBooking(updatedBooking);
};

export const checkInBooking = async (
  userId: string,
  bookingId: string,
  input: CheckInBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  const assignment =
    input.roomIds !== undefined
      ? await resolveBookingRoomAssignments(initialBooking, input.roomIds, {
          forceConcreteRooms: true,
          allowLateAssignment: true,
        })
      : undefined;

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
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
      requireAuditNote(input.note, "Audit note is required for late arrival");
    }

    const selectedRoomIds =
      input.roomIds ?? (await getAssignedCheckInRoomIds(tx, booking));
    await assertTransactionalRoomsAvailable(tx, booking, selectedRoomIds, true);

    const balanceAmount = getBookingBalanceAmount(booking);
    if (balanceAmount.greaterThan(0)) {
      if (input.allowBalanceDueCheckIn !== true) {
        throw new HttpError(
          409,
          "CHECK_IN_BALANCE_DUE",
          "Record balance payment before check-in or use an audited override",
        );
      }
      requireAuditNote(
        input.note,
        "Override note is required to check in with balance due",
      );
    }

    if (assignment !== undefined) {
      for (const itemAssignment of assignment.assignments) {
        await tx.bookingItem.update({
          where: { id: itemAssignment.itemId },
          data: itemAssignment.data,
        });
      }
    }

    const now = new Date();
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {
      status: BookingStatus.CHECKED_IN,
      checkedInAt: now,
      identityVerifiedAt: now,
      ...(input.identityDocumentType !== undefined && {
        identityDocumentType: input.identityDocumentType,
        identityDocumentReference: input.identityDocumentReference,
      }),
      ...(assignment !== undefined && assignment.bookingData),
    });
    await createStatusHistory(tx, {
      bookingId,
      fromStatus: booking.status,
      toStatus: BookingStatus.CHECKED_IN,
      actorUserId: actor.id,
      ...(input.note !== undefined && { note: input.note }),
    });
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.CHECK_IN,
      ...(input.note !== undefined && { note: input.note }),
      metadata: {
        roomIds: selectedRoomIds,
        identityVerified: true,
        lateArrival: today > arrivalDate,
      },
    });
    if (balanceAmount.greaterThan(0)) {
      await createOperationEvent(tx, {
        bookingId,
        propertyId: booking.propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.BALANCE_OVERRIDE,
        ...(input.note !== undefined && { note: input.note }),
        metadata: { balanceAmount: balanceAmount.toString(), stage: "CHECK_IN" },
      });
    }

    return mapTransactionBooking(tx, bookingId);
  });
};

export const checkOutBooking = async (
  userId: string,
  bookingId: string,
  input: CheckOutBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  const extension = await postLateCheckoutExtensionCharge(bookingId, actor, {
    expectedVersion: input.expectedVersion,
    ...(input.note !== undefined && { note: input.note }),
  });

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    assertBookingTransitionAllowed(booking.status, BookingStatus.CHECKED_OUT);
    const { balanceAmount } = assertCheckoutBalanceSettled({
      booking,
      actor,
      ...(input.allowBalanceDueCheckout !== undefined && {
        allowBalanceDueCheckout: input.allowBalanceDueCheckout,
      }),
      ...(input.note !== undefined && { note: input.note }),
      extensionChargeId: extension.extensionChargeId,
      extensionPreview: extension.extensionPreview,
    });

    const roomIds = booking.items
      .map((item) => item.roomId)
      .filter((roomId): roomId is string => roomId !== null);
    const now = new Date();
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {
      status: BookingStatus.CHECKED_OUT,
      checkedOutAt: now,
    });
    for (const roomId of roomIds) {
      const room = await tx.room.findUniqueOrThrow({ where: { id: roomId } });
      await tx.room.update({
        where: { id: roomId },
        data: { housekeepingStatus: RoomHousekeepingStatus.DIRTY },
      });
      await tx.roomHousekeepingEvent.create({
        data: {
          propertyId: booking.propertyId,
          roomId,
          actorUserId: actor.id,
          bookingId,
          fromStatus: room.housekeepingStatus,
          toStatus: RoomHousekeepingStatus.DIRTY,
          note: input.note ?? "Room marked dirty after checkout",
        },
      });
    }
    await createStatusHistory(tx, {
      bookingId,
      fromStatus: booking.status,
      toStatus: BookingStatus.CHECKED_OUT,
      actorUserId: actor.id,
      ...(input.note !== undefined && { note: input.note }),
    });
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.CHECK_OUT,
      ...(input.note !== undefined && { note: input.note }),
      metadata: {
        roomIds,
        balanceAmount: balanceAmount.toString(),
        extensionChargeId: extension.extensionChargeId,
        extraNights: extension.extensionPreview?.extraNights ?? 0,
      },
    });
    if (balanceAmount.greaterThan(0)) {
      await createOperationEvent(tx, {
        bookingId,
        propertyId: booking.propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.BALANCE_OVERRIDE,
        ...(input.note !== undefined && { note: input.note }),
        metadata: {
          balanceAmount: balanceAmount.toString(),
          stage: "CHECK_OUT",
          extensionChargeId: extension.extensionChargeId,
        },
      });
    }
    return mapTransactionBooking(tx, bookingId);
  });
};

export const markBookingNoShow = async (
  userId: string,
  bookingId: string,
  input: NoShowBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    assertBookingTransitionAllowed(booking.status, BookingStatus.NO_SHOW);
    if (!isBookingNoShowEligible(booking)) {
      throw new HttpError(
        409,
        "NO_SHOW_NOT_ELIGIBLE",
        "Booking is not eligible for no-show yet",
      );
    }
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {
      status: BookingStatus.NO_SHOW,
      noShowAt: new Date(),
    });
    await createStatusHistory(tx, {
      bookingId,
      fromStatus: booking.status,
      toStatus: BookingStatus.NO_SHOW,
      actorUserId: actor.id,
      note: input.note,
    });
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.NO_SHOW,
      note: input.note,
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

export const previewBookingRoomMove = async (
  userId: string,
  bookingId: string,
  input: PreviewBookingRoomMoveInput,
): Promise<BookingRoomMovePreviewDTO> => {
  const actor = await getActor(userId);
  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);
  assertExpectedBookingVersion(booking.version, input.expectedVersion);
  await resolveBookingRoomAssignments(booking, input.roomIds, {
    forceConcreteRooms: booking.targetType !== BookingTargetType.UNIT,
    allowLateAssignment: true,
  });
  return prisma.$transaction((tx) =>
    buildRoomMovePricingPreview(booking, input.roomIds, tx),
  );
};

export const moveBookingRooms = async (
  userId: string,
  bookingId: string,
  input: MoveBookingRoomInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  const assignment = await resolveBookingRoomAssignments(
    initialBooking,
    input.roomIds,
    {
      forceConcreteRooms:
        initialBooking.targetType !== BookingTargetType.UNIT,
      allowLateAssignment: true,
    },
  );
  const oldRoomIds = initialBooking.items
    .map((item) => item.roomId)
    .filter((roomId): roomId is string => roomId !== null);

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    const pricingPreview = await buildRoomMovePricingPreview(
      booking,
      input.roomIds,
      tx,
    );
    if (
      pricingPreview.pricingFingerprint !== input.pricingFingerprint ||
      !new Prisma.Decimal(pricingPreview.totalAdjustment).equals(
        input.expectedAdjustmentAmount,
      )
    ) {
      throw new HttpError(
        409,
        "PRICING_CHANGED",
        "Room move pricing changed. Review the latest price before confirming.",
      );
    }
    if (!pricingPreview.allowedPricingActions.includes(input.pricingAction)) {
      throw new HttpError(
        422,
        "ROOM_MOVE_PRICING_ACTION_INVALID",
        "Selected room move pricing action is not available",
      );
    }
    assertComplimentaryUpgradeAllowed(actor, input, pricingPreview);
    await assertTransactionalRoomsAvailable(
      tx,
      booking,
      input.roomIds,
      booking.status === BookingStatus.CHECKED_IN,
    );
    for (const itemAssignment of assignment.assignments) {
      await tx.bookingItem.update({
        where: { id: itemAssignment.itemId },
        data: itemAssignment.data,
      });
    }
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {
      ...assignment.bookingData,
    });
    let folioChargeId: string | null = null;
    if (
      pricingPreview.pricingRequired &&
      input.pricingAction === "CHARGE_DIFFERENCE"
    ) {
      const charge = await tx.bookingFolioCharge.create({
        data: {
          bookingId,
          propertyId: booking.propertyId,
          createdByUserId: actor.id,
          type: "ADJUSTMENT",
          description: `Accommodation upgrade: ${pricingPreview.destinationAssignment}`,
          amount: pricingPreview.totalAdjustment,
          note: input.note,
          metadata: {
            source: "PRICED_ROOM_MOVE",
            pricingAction: input.pricingAction,
            currentAssignment: pricingPreview.currentAssignment,
            destinationAssignment: pricingPreview.destinationAssignment,
            effectiveDate: pricingPreview.effectiveDate,
            affectedNights: pricingPreview.affectedNights,
            currentNightlyRate: pricingPreview.currentNightlyRate,
            destinationNightlyRate: pricingPreview.destinationNightlyRate,
            baseDifference: pricingPreview.baseDifference,
            taxDifference: pricingPreview.taxDifference,
            totalAdjustment: pricingPreview.totalAdjustment,
            taxBreakdown: pricingPreview.taxBreakdown,
            pricingFingerprint: pricingPreview.pricingFingerprint,
            oldRoomIds,
            newRoomIds: input.roomIds,
          },
        },
      });
      folioChargeId = charge.id;
      await billingService.createDebitNoteForFolioCharge(
        bookingId,
        charge.id,
        tx,
      );
    }
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType:
        oldRoomIds.length > 0
          ? BookingOperationEventType.ROOM_MOVE
          : BookingOperationEventType.ROOM_ASSIGNMENT,
      note: input.note,
      metadata: {
        oldRoomIds,
        newRoomIds: input.roomIds,
        pricingAction: input.pricingAction,
        pricingFingerprint: pricingPreview.pricingFingerprint,
        currentNightlyRate: pricingPreview.currentNightlyRate,
        destinationNightlyRate: pricingPreview.destinationNightlyRate,
        affectedNights: pricingPreview.affectedNights,
        effectiveDate: pricingPreview.effectiveDate,
        baseDifference: pricingPreview.baseDifference,
        taxDifference: pricingPreview.taxDifference,
        totalAdjustment: pricingPreview.totalAdjustment,
        waivedAmount:
          input.pricingAction === "COMPLIMENTARY_UPGRADE"
            ? pricingPreview.totalAdjustment
            : "0",
        folioChargeId,
      },
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

export const correctBookingStatus = async (
  userId: string,
  bookingId: string,
  input: CorrectBookingStatusInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  if (!isAdminOverrideRole(actor.role)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only Admin or Super Admin can correct booking status",
    );
  }
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {
      status: input.status,
      ...(input.status !== BookingStatus.CANCELLED && {
        cancellationReason: null,
        cancelledAt: null,
      }),
    });
    await createStatusHistory(tx, {
      bookingId,
      fromStatus: booking.status,
      toStatus: input.status,
      actorUserId: actor.id,
      note: input.note,
    });
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.STATUS_CORRECTION,
      note: input.note,
      metadata: { fromStatus: booking.status, toStatus: input.status },
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

export const updateRoomHousekeeping = async (
  userId: string,
  propertyId: string,
  roomId: string,
  input: UpdateRoomHousekeepingInput,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  return repo.runBookingTransaction(async (tx) => {
    return updateRoomHousekeepingInTransaction(tx, {
      propertyId,
      roomId,
      actorUserId: actor.id,
      housekeeping: input,
    });
  });
};

export const createBookingFolioCharge = async (
  userId: string,
  bookingId: string,
  input: CreateBookingFolioChargeInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  return repo.runBookingTransaction(async (tx) => {
    await createBookingFolioChargeInTransaction(tx, {
      bookingId,
      actorUserId: actor.id,
      charge: input,
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

export const voidBookingFolioCharge = async (
  userId: string,
  bookingId: string,
  chargeId: string,
  input: VoidBookingFolioChargeInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  if (!isAdminOverrideRole(actor.role)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only Admin or Super Admin can void folio charges",
    );
  }
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  return repo.runBookingTransaction(async (tx) => {
    await voidBookingFolioChargeInTransaction(tx, {
      bookingId,
      chargeId,
      actorUserId: actor.id,
      voidCharge: input,
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

export const getOperationsBoard = async (
  userId: string,
  propertyId: string,
  businessDate: Date,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { tenant: true },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  const [bookings, rooms, maintenanceBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        propertyId,
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.CANCELLED,
            BookingStatus.NO_SHOW,
          ],
        },
      },
      include: repo.dashboardBookingInclude,
      orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
    }),
    prisma.room.findMany({
      where: { unit: { is: { propertyId } } },
      include: { unit: true },
      orderBy: [{ unit: { floor: "asc" } }, { number: "asc" }],
    }),
    prisma.maintenanceBlock.findMany({
      where: {
        propertyId,
        status: { notIn: ["RESOLVED", "CANCELLED"] },
      },
      orderBy: [{ priority: "desc" }, { startDate: "asc" }],
    }),
  ]);

  const mapped = await Promise.all(bookings.map((booking) => mapDashboardBooking(booking)));
  return buildOperationsBoardPayload({
    propertyId,
    propertyName: property.name,
    timezone: property.tenant.timezone,
    businessDate,
    bookings,
    mappedBookings: mapped,
    rooms,
    maintenanceBlocks,
  });
};

export const getCashierSummary = async (
  userId: string,
  propertyId: string,
  from: Date,
  to: Date,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { tenant: { select: { timezone: true } } },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  const rangeStart = toBusinessDateBoundary(from, property.tenant.timezone);
  const rangeEnd = toBusinessDateBoundary(to, property.tenant.timezone);
  const [payments, refunds] = await Promise.all([
    prisma.payment.findMany({
      where: {
        propertyId,
        status: PaymentStatus.SUCCEEDED,
        OR: [
          { paidAt: { gte: rangeStart, lt: rangeEnd } },
          { paidAt: null, createdAt: { gte: rangeStart, lt: rangeEnd } },
        ],
      },
      include: {
        receivedBy: true,
        booking: {
          select: {
            id: true,
            bookingRef: true,
            guestNameSnapshot: true,
          },
        },
      },
    }),
    prisma.paymentRefund.findMany({
      where: {
        propertyId,
        status: PaymentRefundStatus.SUCCEEDED,
        OR: [
          { processedAt: { gte: rangeStart, lt: rangeEnd } },
          { processedAt: null, createdAt: { gte: rangeStart, lt: rangeEnd } },
        ],
      },
      include: {
        booking: {
          select: {
            id: true,
            bookingRef: true,
            guestNameSnapshot: true,
          },
        },
        payment: {
          include: { receivedBy: true },
        },
      },
    }),
  ]);

  const refundActorIds = getCashierRefundActorIds(refunds);
  const refundActors =
    refundActorIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: refundActorIds } },
          select: { id: true, fullName: true },
        });
  const refundActorNames = new Map(
    refundActors.map((refundActor) => [refundActor.id, refundActor.fullName]),
  );

  return buildCashierSummaryPayload({
    propertyId,
    rangeStart,
    rangeEnd,
    payments,
    refunds,
    refundActorNames,
  });
};

export const recordBookingBalancePayment = async (
  userId: string,
  bookingId: string,
  input: RecordDashboardBookingPaymentInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);

  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  const updatedBooking = await recordBookingBalancePaymentForBooking(
    actor,
    booking,
    input,
  );

  return mapDashboardBooking(updatedBooking);
};

export const recordBookingRefund = async (
  userId: string,
  bookingId: string,
  input: RecordDashboardBookingRefundInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);

  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  const updatedBooking = await recordBookingRefundForBooking(
    actor,
    booking,
    input,
  );

  return mapDashboardBooking(updatedBooking);
};

export const updateRefundRequest = async (
  userId: string,
  bookingId: string,
  requestId: string,
  input: UpdateDashboardRefundRequestInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);

  const booking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, booking.propertyId);

  const updatedBooking = await updateRefundRequestForBooking(
    actor,
    booking.id,
    requestId,
    input,
  );

  return mapDashboardBooking(updatedBooking);
};
