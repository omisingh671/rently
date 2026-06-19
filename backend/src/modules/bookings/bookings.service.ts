import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingRefundRequestStatus,
  BookingStatus,
  BookingTargetType,
  BookingOperationEventType,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
  RoomHousekeepingStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { randomUUID } from "node:crypto";
import { createBookingForUser } from "@/modules/public/bookings/bookings.service.js";
import { generateAvailabilityOptions } from "@/modules/public/availability/availability.service.js";
import { createManualPayment } from "@/modules/payments/payments.service.js";
import { findUserById } from "@/modules/users/users.repository.js";
import { listAssignedPropertyIds } from "@/modules/property-assignments/property-assignments.repository.js";
import { findPropertyById } from "@/modules/properties/properties.repository.js";
import { billingService } from "@/modules/billing/index.js";
import * as repo from "./bookings.repository.js";

import { buildDashboardRoomBoard } from "./bookings-room-board.mapper.js";
import {
  mapBooking,
  isBookingNoShowEligible,
} from "./bookings.mapper.js";
import { parsePolicySnapshot } from "@/modules/booking-policy/booking-policy.policy.js";
import {
  assertBookingLifecycleDateAllowed,
  assertBookingTransitionAllowed,
  isAdminOverrideRole,
  requireAuditNote,
  assertManualPaymentProof,
  getLocalDateValue,
} from "./bookings.helper.js";
import {
  assertBookingCanAcceptPayment,
  assertRefundProviderAvailable,
  getActiveRefundRequest,
  getBookingBalanceAmount,
  getBookingRefundableAmount,
  getPaymentRefundableAmount,
  getRefundPaymentStatus,
  syncFulfilledRefundRequest,
} from "./bookings.financials.js";
import {
  assertBookingHasAssignedTarget,
  assertTransactionalRoomsAvailable,
  buildRoomMovePricingPreview,
  getAssignedCheckInRoomIds,
  getBookingAssignmentLabels,
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
  voidBookingFolioChargeInTransaction,
} from "./bookings.folio.js";

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

export type DashboardActor = NonNullable<Awaited<ReturnType<typeof findUserById>>>;
export type DashboardPropertyScope = {
  isGlobal: boolean;
  propertyIds: string[];
};

const ensureActiveActor = (actor: DashboardActor) => {
  if (!actor.isActive) {
    throw new HttpError(403, "USER_DISABLED", "User account is disabled");
  }
};

export const getActor = async (userId: string): Promise<DashboardActor> => {
  const actor = await findUserById(userId);
  if (!actor) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }

  ensureActiveActor(actor);
  return actor;
};

export const getPropertyScope = async (
  actor: DashboardActor,
): Promise<DashboardPropertyScope> => {
  if (actor.role === UserRole.SUPER_ADMIN) {
    return {
      isGlobal: true,
      propertyIds: [],
    };
  }

  if (actor.role === UserRole.ADMIN) {
    return {
      isGlobal: false,
      propertyIds: await listAssignedPropertyIds(
        actor.id,
        "ADMIN",
      ),
    };
  }

  if (actor.role === UserRole.MANAGER) {
    return {
      isGlobal: false,
      propertyIds: await listAssignedPropertyIds(
        actor.id,
        "MANAGER",
      ),
    };
  }

  return {
    isGlobal: false,
    propertyIds: [],
  };
};

const assertPropertyInScope = async (
  actor: DashboardActor,
  propertyId: string,
): Promise<void> => {
  const scope = await getPropertyScope(actor);
  if (scope.isGlobal) {
    return;
  }

  if (!scope.propertyIds.includes(propertyId)) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
};

export const ensurePropertyExists = async (propertyId: string) => {
  const property = await findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  return property;
};

const ensureBookingExists = async (bookingId: string) => {
  const booking = await repo.findBookingById(bookingId);
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return booking;
};

const findOrCreateWalkInGuest = async (
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

  const passwordHash = randomUUID(); // Walk-in guest password hash is just a random UUID since they won't log in this way
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

const getStayNights = (from: Date, to: Date) =>
  Math.max(
    1,
    Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
  );

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

const mapDashboardBookings = async (
  bookings: repo.DashboardBookingRecord[],
) => {
  const syncedBookings = await Promise.all(
    bookings.map(syncFulfilledRefundRequest),
  );
  const assignmentLabels = await getBookingAssignmentLabels(bookings);
  return syncedBookings.map((booking) => mapBooking(booking, assignmentLabels));
};

const mapDashboardBooking = async (booking: repo.DashboardBookingRecord) => {
  const syncedBooking = await syncFulfilledRefundRequest(booking);
  const mapped = await mapDashboardBookings([syncedBooking]);
  const firstBooking = mapped[0];

  if (!firstBooking) {
    throw new HttpError(
      500,
      "BOOKING_MAP_FAILED",
      "Booking could not be mapped",
    );
  }

  return firstBooking;
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

const mapTransactionBooking = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
) =>
  mapDashboardBooking(
    await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: repo.dashboardBookingInclude,
    }),
  );

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

  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    assertBookingTransitionAllowed(booking.status, BookingStatus.CHECKED_OUT);
    const balanceAmount = getBookingBalanceAmount(booking);
    if (balanceAmount.greaterThan(0)) {
      if (
        input.allowBalanceDueCheckout !== true ||
        !isAdminOverrideRole(actor.role)
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
      metadata: { roomIds, balanceAmount: balanceAmount.toString() },
    });
    if (balanceAmount.greaterThan(0)) {
      await createOperationEvent(tx, {
        bookingId,
        propertyId: booking.propertyId,
        actorUserId: actor.id,
        eventType: BookingOperationEventType.BALANCE_OVERRIDE,
        ...(input.note !== undefined && { note: input.note }),
        metadata: { balanceAmount: balanceAmount.toString(), stage: "CHECK_OUT" },
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

const allowedHousekeepingTransitions: Record<
  RoomHousekeepingStatus,
  readonly RoomHousekeepingStatus[]
> = {
  [RoomHousekeepingStatus.DIRTY]: [RoomHousekeepingStatus.CLEANING],
  [RoomHousekeepingStatus.CLEANING]: [
    RoomHousekeepingStatus.DIRTY,
    RoomHousekeepingStatus.CLEAN,
  ],
  [RoomHousekeepingStatus.CLEAN]: [
    RoomHousekeepingStatus.DIRTY,
    RoomHousekeepingStatus.INSPECTED,
  ],
  [RoomHousekeepingStatus.INSPECTED]: [RoomHousekeepingStatus.DIRTY],
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
    const room = await tx.room.findUnique({
      where: { id: roomId },
      include: { unit: true },
    });
    if (!room || room.unit.propertyId !== propertyId) {
      throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
    }
    if (room.housekeepingStatus !== input.expectedStatus) {
      throw new HttpError(
        409,
        "HOUSEKEEPING_STATUS_CONFLICT",
        "Room housekeeping status changed. Reload and try again.",
      );
    }
    if (!allowedHousekeepingTransitions[room.housekeepingStatus].includes(input.status)) {
      throw new HttpError(
        409,
        "INVALID_HOUSEKEEPING_TRANSITION",
        `Cannot move housekeeping from ${room.housekeepingStatus} to ${input.status}`,
      );
    }
    await tx.room.update({
      where: { id: roomId },
      data: { housekeepingStatus: input.status },
    });
    const event = await tx.roomHousekeepingEvent.create({
      data: {
        propertyId,
        roomId,
        actorUserId: actor.id,
        fromStatus: room.housekeepingStatus,
        toStatus: input.status,
        ...(input.note !== undefined && { note: input.note }),
      },
    });
    return {
      roomId,
      status: input.status,
      updatedAt: event.createdAt,
    };
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
  assertBookingCanAcceptPayment(booking);
  assertManualPaymentProof(input);

  const balanceAmount = getBookingBalanceAmount(booking);
  const amount = new Prisma.Decimal(input.amount);

  if (balanceAmount.lessThanOrEqualTo(0)) {
    throw new HttpError(
      409,
      "BOOKING_ALREADY_PAID",
      "Booking is already fully paid",
    );
  }

  if (amount.greaterThan(balanceAmount)) {
    throw new HttpError(
      422,
      "PAYMENT_OVERPAYMENT",
      "Payment amount cannot exceed the booking balance",
    );
  }

  await createManualPayment({
    actorUserId: actor.id,
    bookingId,
    idempotencyKey:
      input.idempotencyKey ?? `dashboard-balance-${bookingId}-${randomUUID()}`,
    amount: input.amount,
    purpose: PaymentPurpose.BALANCE,
    method: input.method,
    metadata: {
      recordedVia: "DASHBOARD",
      ...(input.referenceId !== undefined && {
        manualReferenceId: input.referenceId.trim(),
      }),
      ...(input.payerDetail !== undefined && {
        manualPayerDetail: input.payerDetail.trim(),
      }),
    },
    ...(input.note !== undefined && { note: input.note }),
    ...(input.paidAt !== undefined && { paidAt: input.paidAt }),
  });

  const updatedBooking = await repo.findBookingById(bookingId);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

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

  if (
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.NO_SHOW
  ) {
    throw new HttpError(
      409,
      "BOOKING_REFUND_NOT_ALLOWED",
      "Refunds can be recorded only for cancelled or no-show bookings",
    );
  }

  const amount = new Prisma.Decimal(input.amount);
  const payment = booking.payments.find((item) => item.id === input.paymentId);

  if (!payment || payment.bookingId !== booking.id) {
    throw new HttpError(
      404,
      "PAYMENT_NOT_FOUND",
      "Payment was not found for this booking",
    );
  }

  if (payment.status !== PaymentStatus.SUCCEEDED) {
    throw new HttpError(
      409,
      "PAYMENT_NOT_REFUNDABLE",
      "Only successful payments can be refunded",
    );
  }

  assertRefundProviderAvailable(payment.provider, input.method);

  const policySnapshot = parsePolicySnapshot(booking.policySnapshot);
  if (
    payment.purpose === PaymentPurpose.TOKEN &&
    policySnapshot?.tokenRefundable === false
  ) {
    throw new HttpError(
      422,
      "TOKEN_NOT_REFUNDABLE",
      "This booking policy marks the token payment as non-refundable",
    );
  }

  const refundRequest =
    input.refundRequestId !== undefined
      ? booking.refundRequests.find(
          (request) => request.id === input.refundRequestId,
        ) ?? null
      : getActiveRefundRequest(booking);

  if (input.refundRequestId !== undefined && refundRequest === null) {
    throw new HttpError(
      404,
      "REFUND_REQUEST_NOT_FOUND",
      "Refund request was not found for this booking",
    );
  }

  if (
    refundRequest !== null &&
    (refundRequest.status === BookingRefundRequestStatus.REJECTED ||
      refundRequest.status === BookingRefundRequestStatus.FULFILLED ||
      refundRequest.status === BookingRefundRequestStatus.CANCELLED)
  ) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_CLOSED",
      "This refund request is already closed",
    );
  }

  const existingRefund =
    input.idempotencyKey !== undefined
      ? await repo.findRefundByIdempotencyKey(input.idempotencyKey)
      : null;

  if (existingRefund) {
    if (
      existingRefund.bookingId !== booking.id ||
      existingRefund.paymentId !== payment.id ||
      !existingRefund.amount.equals(amount)
    ) {
      throw new HttpError(
        409,
        "REFUND_IDEMPOTENCY_CONFLICT",
        "Idempotency key was already used for a different refund",
      );
    }

    return mapDashboardBooking(booking);
  }

  const refundableAmount = getPaymentRefundableAmount(payment);
  if (amount.greaterThan(refundableAmount)) {
    throw new HttpError(
      422,
      "REFUND_OVERPAYMENT",
      "Refund amount cannot exceed the refundable payment balance",
    );
  }

  const idempotencyKey =
    input.idempotencyKey ?? `dashboard-refund-${bookingId}-${payment.id}-${randomUUID()}`;

  const projectedBooking = {
    ...booking,
    payments: booking.payments.map((item) =>
      item.id === payment.id
        ? {
            ...item,
            refunds: [
              ...item.refunds,
              {
                id: idempotencyKey,
                bookingId: booking.id,
                paymentId: payment.id,
                propertyId: booking.propertyId,
                userId: booking.userId,
                refundRequestId: refundRequest?.id ?? null,
                provider: payment.provider,
                status: PaymentRefundStatus.SUCCEEDED,
                method: input.method,
                amount,
                currency: payment.currency,
                reason: input.reason,
                idempotencyKey,
                providerRefundId: null,
                providerRefundStatus: null,
                metadata: null,
                processedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          }
        : item,
    ),
  };

  const projectedRefundableAmount = getBookingRefundableAmount(projectedBooking);
  const refundRequestUpdate =
    refundRequest === null
      ? undefined
      : {
          id: refundRequest.id,
          data: {
            status: projectedRefundableAmount.lessThanOrEqualTo(0)
              ? BookingRefundRequestStatus.FULFILLED
              : BookingRefundRequestStatus.IN_REVIEW,
            reviewedBy: {
              connect: {
                id: actor.id,
              },
            },
            reviewedAt: new Date(),
            ...(projectedRefundableAmount.lessThanOrEqualTo(0) && {
              fulfilledAt: new Date(),
            }),
          },
        };

  const updatedBooking = await repo.createPaymentRefundForBooking(
    {
      booking: {
        connect: {
          id: booking.id,
        },
      },
      payment: {
        connect: {
          id: payment.id,
        },
      },
      property: {
        connect: {
          id: booking.propertyId,
        },
      },
      user: {
        connect: {
          id: booking.userId,
        },
      },
      ...(refundRequest !== null && {
        refundRequest: {
          connect: {
            id: refundRequest.id,
          },
        },
      }),
      provider: payment.provider,
      status: PaymentRefundStatus.SUCCEEDED,
      method: input.method,
      amount,
      currency: payment.currency,
      reason: input.reason,
      idempotencyKey,
      metadata: {
        recordedByUserId: actor.id,
        source: "DASHBOARD_MANUAL_REFUND",
      },
      processedAt: new Date(),
    },
    getRefundPaymentStatus(projectedBooking),
    refundRequestUpdate,
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

  const refundRequest = booking.refundRequests.find(
    (request) => request.id === requestId,
  );
  if (!refundRequest) {
    throw new HttpError(
      404,
      "REFUND_REQUEST_NOT_FOUND",
      "Refund request was not found for this booking",
    );
  }

  if (
    refundRequest.status === BookingRefundRequestStatus.FULFILLED ||
    refundRequest.status === BookingRefundRequestStatus.CANCELLED
  ) {
    throw new HttpError(
      409,
      "REFUND_REQUEST_CLOSED",
      "This refund request is already closed",
    );
  }

  if (
    input.status === BookingRefundRequestStatus.REJECTED &&
    !input.adminNote?.trim()
  ) {
    throw new HttpError(
      422,
      "REFUND_REJECTION_NOTE_REQUIRED",
      "Admin note is required when rejecting a refund request",
    );
  }

  await repo.updateRefundRequestById(requestId, {
    ...(input.status !== undefined && { status: input.status }),
    ...(input.adminNote !== undefined && { adminNote: input.adminNote }),
    reviewedBy: {
      connect: {
        id: actor.id,
      },
    },
    reviewedAt: new Date(),
  });

  const updatedBooking = await repo.findBookingById(bookingId);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return mapDashboardBooking(updatedBooking);
};

const assertRole = (actor: DashboardActor, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};
