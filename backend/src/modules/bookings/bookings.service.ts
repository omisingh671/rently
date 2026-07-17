import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingStatus,
  BookingTargetType,
  UserRole,
  NotificationEventKey,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { assertStayStartsOnOrAfterBusinessDate } from "@/common/utils/business-date.js";
import { createBookingForUser } from "@/modules/public/bookings/bookings.service.js";
import { generateAvailabilityOptions } from "@/modules/public/availability/availability.service.js";
import * as repo from "./bookings.repository.js";
import { publishBookingNotification } from "@/modules/notifications/notifications.events.js";

import { buildDashboardRoomBoard } from "./bookings-room-board.mapper.js";
import { isAdminOverrideRole } from "./bookings.helper.js";
import {
  buildRoomMovePricingPreview,
  resolveDashboardBookingUpdateAssignment,
  resolveBookingRoomAssignments,
} from "./bookings.assignment.js";
import {
  assertDashboardBookingStatusUpdateAllowed,
  checkInBookingInTransaction,
  checkOutBookingInTransaction,
  reverseBookingLifecycleInTransaction,
  markBookingNoShowInTransaction,
  assertExpectedBookingVersion,
  findTransactionBooking,
  updateDashboardBookingLifecycle,
} from "./bookings.lifecycle.js";
import { moveBookingRoomsInTransaction } from "./bookings.room-move.js";
import {
  buildStayExtensionPreview,
  commitStayExtension,
} from "./bookings.stay-extension.js";
import {
  buildCashierSummaryForProperty,
  buildOperationsBoardForProperty,
} from "./bookings.operations.js";
import {
  createBookingFolioChargeInTransaction,
  postLateCheckoutExtensionCharge,
  voidBookingFolioChargeInTransaction,
} from "./bookings.folio.js";
import {
  recordBookingBalancePaymentForBooking,
  recordBookingRefundForBooking,
  updateRefundRequestForBooking,
} from "./bookings.payments.js";
import {
  updateRoomHousekeepingInTransaction,
} from "./bookings.housekeeping.js";
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
  buildManualBookingAvailabilityDTO,
  findOrCreateWalkInGuest,
  getStayNights,
} from "./bookings.walk-in.js";
import {
  buildCheckInPolicyPreview,
  buildCheckOutPolicyPreview,
} from "./bookings.stay-policy.js";

import type {
  CheckDashboardManualBookingAvailabilityInput,
  CreateDashboardManualBookingInput,
  DashboardBookingListInput,
  DashboardRoomBoardInput,
  CheckInBookingInput,
  CheckOutBookingInput,
  ReverseBookingLifecycleInput,
  CreateBookingFolioChargeInput,
  MoveBookingRoomInput,
  PreviewBookingRoomMoveInput,
  PreviewStayExtensionInput,
  CommitStayExtensionInput,
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
  BookingStayExtensionPreviewDTO,
} from "./bookings.dto.js";

export {
  ensurePropertyExists,
  getActor,
  getPropertyScope,
  type DashboardActor,
  type DashboardPropertyScope,
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
  assertStayStartsOnOrAfterBusinessDate(input.from, property.tenant.timezone);
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
  return buildManualBookingAvailabilityDTO(propertyId, input, options);
};

export const createManualBooking = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardManualBookingInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const property = await ensurePropertyExists(propertyId);
  assertStayStartsOnOrAfterBusinessDate(input.from, property.tenant.timezone);
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

  const { nextStatus, statusChanged } =
    assertDashboardBookingStatusUpdateAllowed(booking, actor, input);

  const assignment = await resolveDashboardBookingUpdateAssignment(
    booking,
    actor,
    input,
  );

  const updated = await updateDashboardBookingLifecycle({
    booking,
    actorUserId: actor.id,
    update: input,
    nextStatus,
    statusChanged,
    ...(assignment !== undefined && { assignment }),
  });
  if (statusChanged) {
    const eventKey = nextStatus === BookingStatus.CANCELLED
      ? NotificationEventKey.BOOKING_CANCELLED
      : nextStatus === BookingStatus.CHECKED_IN
        ? NotificationEventKey.BOOKING_CHECKED_IN
        : nextStatus === BookingStatus.CHECKED_OUT
          ? NotificationEventKey.BOOKING_CHECKED_OUT
          : null;
    if (eventKey) {
      await publishBookingNotification({
        eventKey,
        businessEventId: `${bookingId}:${updated.version}:${nextStatus}`,
        bookingId,
      });
    }
  }
  return updated;
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

  const updated = await repo.runBookingTransaction(async (tx) => {
    return checkInBookingInTransaction(tx, {
      bookingId,
      actorUserId: actor.id,
      actorRole: actor.role,
      checkIn: input,
      ...(assignment !== undefined && { assignment }),
    });
  });
  await publishBookingNotification({
    eventKey: NotificationEventKey.BOOKING_CHECKED_IN,
    businessEventId: `${bookingId}:${updated.version}:check-in`,
    bookingId,
  });
  return updated;
};

export const previewCheckInPolicy = async (
  userId: string,
  bookingId: string,
  expectedVersion: number,
) => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, expectedVersion);
    return buildCheckInPolicyPreview(tx, booking);
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

  const updated = await repo.runBookingTransaction(async (tx) => {
    return checkOutBookingInTransaction(tx, {
      bookingId,
      actor,
      checkOut: input,
      extensionChargeId: extension.extensionChargeId,
      extraNights: extension.extensionPreview?.extraNights ?? 0,
    });
  });
  await publishBookingNotification({
    eventKey: NotificationEventKey.BOOKING_CHECKED_OUT,
    businessEventId: `${bookingId}:${updated.version}:check-out`,
    bookingId,
  });
  return updated;
};

export const previewCheckOutPolicy = async (
  userId: string,
  bookingId: string,
  expectedVersion: number,
) => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);
  return repo.runBookingTransaction(async (tx) => {
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, expectedVersion);
    return buildCheckOutPolicyPreview(tx, booking);
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
    return markBookingNoShowInTransaction(tx, {
      bookingId,
      actorUserId: actor.id,
      noShow: input,
    });
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
    return moveBookingRoomsInTransaction(tx, {
      bookingId,
      actor,
      roomMove: input,
      assignment,
      oldRoomIds,
    });
  });
};

export const previewStayExtension = async (
  userId: string,
  bookingId: string,
  input: PreviewStayExtensionInput,
): Promise<BookingStayExtensionPreviewDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);

  return repo.runBookingTransaction(async (tx) =>
    buildStayExtensionPreview(
      tx,
      await findTransactionBooking(tx, bookingId),
      input,
    ),
  );
};

export const extendStay = async (
  userId: string,
  bookingId: string,
  input: CommitStayExtensionInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);

  return repo.runBookingTransaction((tx) =>
    commitStayExtension(tx, {
      bookingId,
      actor,
      extension: input,
    }),
  );
};

export const reverseBookingLifecycle = async (
  userId: string,
  bookingId: string,
  input: ReverseBookingLifecycleInput,
): Promise<DashboardBookingDTO> => {
  const actor = await getActor(userId);
  if (!isAdminOverrideRole(actor.role)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only Admin or Super Admin can reverse booking lifecycle actions",
    );
  }
  const initialBooking = await ensureBookingExists(bookingId);
  await assertPropertyInScope(actor, initialBooking.propertyId);

  return repo.runBookingTransaction(async (tx) => {
    return reverseBookingLifecycleInTransaction(tx, {
      bookingId,
      actorUserId: actor.id,
      reversal: input,
    });
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
  return buildOperationsBoardForProperty(propertyId, businessDate);
};

export const getCashierSummary = async (
  userId: string,
  propertyId: string,
  from: Date,
  to: Date,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  return buildCashierSummaryForProperty(propertyId, from, to);
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
