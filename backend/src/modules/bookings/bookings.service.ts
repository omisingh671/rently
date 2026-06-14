import { prisma } from "@/db/prisma.js";
import {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingStatus,
  BookingTargetType,
  BookingOperationEventType,
  FolioChargeStatus,
  PaymentMethod,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
  RoomHousekeepingStatus,
  RoomStatus,
  UnitStatus,
  UserRole,
  PaymentProvider,
  TaxCalculationMode,
  TaxCategory,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { createHash, randomUUID } from "node:crypto";
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
  formatBookingRoomAssignmentLabel,
  formatBookingUnitAssignmentLabel,
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

const ensureRoomExists = async (roomId: string) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
    },
  });
  if (!room) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }

  return room;
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

const ensureRoomBelongsToProperty = (
  room: { unit: { propertyId: string } },
  propertyId: string,
) => {
  if (room.unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_ROOM",
      "Room does not belong to the selected property",
    );
  }
};

const getRoomAssignmentLabel = (room: { number: string; name: string }) =>
  `Room ${room.number} (${room.name})`;

const assertBookingHasAssignedTarget = (booking: repo.DashboardBookingRecord) => {
  const hasAssignedItems = booking.items.every(
    (item) => item.roomId !== null || item.unitId !== null,
  );

  if (
    booking.items.length === 0 ||
    !hasAssignedItems
  ) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Assign a room or unit before check-in",
    );
  }
};

const getBookingPaidAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0),
    );

const refundReservedStatuses: readonly PaymentRefundStatus[] = [
  PaymentRefundStatus.PENDING,
  PaymentRefundStatus.SUCCEEDED,
] as const;

const isRefundReserved = (status: PaymentRefundStatus) =>
  refundReservedStatuses.includes(status);

const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] = [
  BookingRefundRequestStatus.REQUESTED,
  BookingRefundRequestStatus.IN_REVIEW,
];

const getActiveRefundRequest = (booking: repo.DashboardBookingRecord) =>
  booking.refundRequests.find((request) =>
    activeRefundRequestStatuses.includes(request.status),
  ) ?? null;

const getPaymentRefundedAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) =>
  payment.refunds
    .filter((refund) => isRefundReserved(refund.status))
    .reduce((total, refund) => total.plus(refund.amount), new Prisma.Decimal(0));

const getBookingRefundedAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundedAmount(payment)),
    new Prisma.Decimal(0),
  );

const getPaymentRefundableAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) => {
  if (payment.status !== PaymentStatus.SUCCEEDED) {
    return new Prisma.Decimal(0);
  }

  const refundableAmount = payment.amount.minus(getPaymentRefundedAmount(payment));
  return refundableAmount.lessThan(0) ? new Prisma.Decimal(0) : refundableAmount;
};

const getJsonNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? new Prisma.Decimal(value)
    : new Prisma.Decimal(0);

const getBookingNonRefundableTaxAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const taxBreakdown = booking.taxBreakdown;

  if (!Array.isArray(taxBreakdown)) {
    return new Prisma.Decimal(0);
  }

  return taxBreakdown.reduce((total, item) => {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return total;
    }

    const tax = item as Record<string, unknown>;

    if (tax.isRefundable !== false) {
      return total;
    }

    return total.plus(getJsonNumber(tax.taxAmount));
  }, new Prisma.Decimal(0));
};

const getBookingNonRefundableTokenAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const policySnapshot = parsePolicySnapshot(booking.policySnapshot);

  if (policySnapshot?.tokenRefundable !== false) {
    return new Prisma.Decimal(0);
  }

  return booking.payments
    .filter(
      (payment) =>
        payment.status === PaymentStatus.SUCCEEDED &&
        payment.purpose === PaymentPurpose.TOKEN,
    )
    .reduce((total, payment) => total.plus(payment.amount), new Prisma.Decimal(0));
};

const getBookingRefundableAmount = (
  booking: repo.DashboardBookingRecord,
) => {
  const baseRefundableAmount = booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundableAmount(payment)),
    new Prisma.Decimal(0),
  );

  const refundableAmount = baseRefundableAmount
    .minus(getBookingNonRefundableTaxAmount(booking))
    .minus(getBookingNonRefundableTokenAmount(booking));

  return refundableAmount.lessThan(0) ? new Prisma.Decimal(0) : refundableAmount;
};

const syncFulfilledRefundRequest = async (
  booking: repo.DashboardBookingRecord,
) => {
  const refundRequest = getActiveRefundRequest(booking);

  if (
    refundRequest === null ||
    getBookingRefundedAmount(booking).lessThanOrEqualTo(0) ||
    getBookingRefundableAmount(booking).greaterThan(0)
  ) {
    return booking;
  }

  const now = new Date();
  await repo.updateRefundRequestById(refundRequest.id, {
    status: BookingRefundRequestStatus.FULFILLED,
    reviewedAt: refundRequest.reviewedAt ?? now,
    fulfilledAt: refundRequest.fulfilledAt ?? now,
  });

  const updatedBooking = await repo.findBookingById(booking.id);
  if (!updatedBooking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  return updatedBooking;
};

const getBookingBalanceAmount = (booking: repo.DashboardBookingRecord) => {
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW) {
    return new Prisma.Decimal(0);
  }

  const netPaidAmount = getBookingPaidAmount(booking).minus(
    getBookingRefundedAmount(booking),
  );
  const folioTotal = booking.folioCharges
    .filter((charge) => charge.status === FolioChargeStatus.ACTIVE)
    .reduce(
      (total, charge) => total.plus(charge.amount),
      new Prisma.Decimal(0),
    );
  const balance = booking.totalAmount.plus(folioTotal).minus(netPaidAmount);
  return balance.lessThan(0) ? new Prisma.Decimal(0) : balance;
};

const assertBookingCanAcceptPayment = (
  booking: repo.DashboardBookingRecord,
) => {
  if (booking.status === BookingStatus.CANCELLED) {
    throw new HttpError(
      409,
      "BOOKING_CANCELLED",
      "Cancelled bookings cannot accept payments",
    );
  }

  if (booking.status === BookingStatus.NO_SHOW) {
    throw new HttpError(
      409,
      "BOOKING_NO_SHOW",
      "No-show bookings cannot accept payments",
    );
  }

  if (booking.status === BookingStatus.CHECKED_OUT) {
    throw new HttpError(
      409,
      "BOOKING_PAYMENT_CLOSED",
      "Checked-out bookings cannot accept payments",
    );
  }
};

const resolveBookingRoomAssignments = async (
  booking: repo.DashboardBookingRecord,
  roomIds: string[],
  options: {
    forceConcreteRooms?: boolean;
    allowLateAssignment?: boolean;
  } = {},
) => {
  const isUnitBooking =
    booking.targetType === BookingTargetType.UNIT &&
    options.forceConcreteRooms !== true;

  if (
    booking.status === BookingStatus.CHECKED_OUT ||
    booking.status === BookingStatus.CANCELLED ||
    booking.status === BookingStatus.NO_SHOW
  ) {
    throw new HttpError(
      409,
      "BOOKING_ASSIGNMENT_CLOSED",
      "Cannot change assignment after checkout, cancellation, or no-show",
    );
  }

  const timeZone = booking.property.tenant.timezone;
  const today = getLocalDateValue(new Date(), timeZone);
  if (
    booking.status !== BookingStatus.CHECKED_IN &&
    options.allowLateAssignment !== true &&
    today > getLocalDateValue(booking.checkIn, timeZone)
  ) {
    throw new HttpError(
      409,
      "BOOKING_ASSIGNMENT_CLOSED",
      "Cannot change room assignment after the check-in date has passed",
    );
  }

  if (booking.items.length === 0) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Booking must have assignable stay items",
    );
  }

  if (!isUnitBooking && roomIds.length !== booking.items.length) {
    throw new HttpError(
      422,
      "ROOM_ASSIGNMENT_COUNT_MISMATCH",
      `This booking requires exactly ${booking.items.length} rooms`,
    );
  }

  if (isUnitBooking && roomIds.length === 0) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Select every room in the destination unit",
    );
  }

  const uniqueRoomIds = new Set(roomIds);
  if (uniqueRoomIds.size !== roomIds.length) {
    throw new HttpError(
      422,
      "DUPLICATE_ROOM_ASSIGNMENT",
      "Each selected room must be unique",
    );
  }

  const rooms = await Promise.all(roomIds.map((roomId) => ensureRoomExists(roomId)));
  if (isUnitBooking) {
    const selectedUnitIds = new Set(rooms.map((room) => room.unitId));
    if (selectedUnitIds.size !== 1) {
      throw new HttpError(
        422,
        "UNIT_ASSIGNMENT_MISMATCH",
        "All selected rooms must belong to the same unit",
      );
    }

    const selectedUnitId = rooms[0]?.unitId;
    const [selectedUnit] = selectedUnitId
      ? await repo.listBookingAssignmentUnitsByIds([selectedUnitId])
      : [];
    const selectedRoomIds = new Set(roomIds);
    if (
      !selectedUnit ||
      selectedUnit.rooms.length !== selectedRoomIds.size ||
      selectedUnit.rooms.some((room) => !selectedRoomIds.has(room.id))
    ) {
      throw new HttpError(
        422,
        "UNIT_ASSIGNMENT_INCOMPLETE",
        "Select every room in the destination unit",
      );
    }
  }

  for (const room of rooms) {
    ensureRoomBelongsToProperty(room, booking.propertyId);

    if (!room.isActive || !room.unit.isActive) {
      throw new HttpError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Selected room is inactive",
      );
    }

    if (
      room.status === RoomStatus.MAINTENANCE ||
      room.status === RoomStatus.OCCUPIED ||
      room.unit.status === UnitStatus.MAINTENANCE ||
      room.unit.status === UnitStatus.INACTIVE
    ) {
      throw new HttpError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Selected room is not available for assignment",
      );
    }
  }

  const availabilityChecks = rooms.flatMap((room) => [
    repo.hasOverlappingRoomBooking({
      roomId: room.id,
      unitId: room.unitId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      excludeBookingId: booking.id,
    }),
    repo.hasOverlappingRoomMaintenance({
      propertyId: booking.propertyId,
      roomId: room.id,
      unitId: room.unitId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
    }),
  ]);

  if ((await Promise.all(availabilityChecks)).some(Boolean)) {
    throw new HttpError(
      409,
      "ROOM_NOT_AVAILABLE",
      "Selected room is not available for these dates",
    );
  }

  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const selectedRoomIds = new Set(roomIds);
  const selectedItemRoomIds = new Set<string>();
  const itemAssignments = booking.items.map((item) => {
    if (item.roomId !== null && selectedRoomIds.has(item.roomId)) {
      selectedItemRoomIds.add(item.roomId);
      return { item, room: roomsById.get(item.roomId) };
    }

    return { item, room: undefined };
  });
  const remainingRooms = rooms.filter((room) => !selectedItemRoomIds.has(room.id));
  let nextRoomIndex = 0;

  const assignments = await Promise.all(
    itemAssignments.map(async ({ item, room }) => {
      const assignedRoom = room ?? remainingRooms[nextRoomIndex++];
      if (!assignedRoom) {
        throw new HttpError(
          422,
          "ROOM_ASSIGNMENT_COUNT_MISMATCH",
          `This booking requires exactly ${booking.items.length} rooms`,
        );
      }

      if (isUnitBooking) {
        const [unit] = await repo.listBookingAssignmentUnitsByIds([assignedRoom.unitId]);
        const targetLabel = unit ? formatBookingUnitAssignmentLabel(unit) : `Unit ${assignedRoom.unit.unitNumber}`;
        return {
          itemId: item.id,
          data: {
            targetType: BookingTargetType.UNIT,
            unitId: assignedRoom.unitId,
            roomId: null,
            targetLabel,
            capacity: unit?.rooms.reduce((sum, r) => sum + r.maxOccupancy, 0) ?? assignedRoom.maxOccupancy,
          } satisfies Prisma.BookingItemUpdateInput,
        };
      } else {
        const targetLabel = getRoomAssignmentLabel(assignedRoom);
        return {
          itemId: item.id,
          data: {
            targetType: BookingTargetType.ROOM,
            unitId: assignedRoom.unitId,
            roomId: assignedRoom.id,
            targetLabel,
            capacity: assignedRoom.maxOccupancy,
          } satisfies Prisma.BookingItemUpdateInput,
        };
      }
    })
  );

  const firstRoom = rooms[0];
  if (!firstRoom) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Booking must have assignable stay items",
    );
  }

  if (isUnitBooking) {
    const [unit] = await repo.listBookingAssignmentUnitsByIds([firstRoom.unitId]);
    const targetLabel = unit ? formatBookingUnitAssignmentLabel(unit) : `Unit ${firstRoom.unit.unitNumber}`;
    return {
      bookingData: {
        targetType: BookingTargetType.UNIT,
        unitId: firstRoom.unitId,
        roomId: null,
        targetLabel,
      } satisfies Prisma.BookingUpdateInput,
      assignments,
    };
  }

  const bookingTargetLabel =
    booking.items.length === 1
      ? getRoomAssignmentLabel(firstRoom)
      : `${booking.items.length}-room stay`;

  return {
    bookingData: {
      targetType: BookingTargetType.ROOM,
      unitId: firstRoom.unitId,
      roomId: firstRoom.id,
      targetLabel: bookingTargetLabel,
    } satisfies Prisma.BookingUpdateInput,
    assignments,
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

const uniqueIds = (ids: Array<string | null | undefined>) =>
  Array.from(
    new Set(ids.filter((id): id is string => id !== null && id !== undefined)),
  );

const getBookingAssignmentLabels = async (
  bookings: repo.DashboardBookingRecord[],
) => {
  const roomIds = uniqueIds(
    bookings.flatMap((booking) => [
      booking.roomId,
      ...booking.items.map((item) => item.roomId),
    ]),
  );
  const unitIds = uniqueIds(
    bookings.flatMap((booking) => [
      booking.unitId,
      ...booking.items.map((item) => item.unitId),
    ]),
  );

  const [rooms, units] = await Promise.all([
    repo.listBookingAssignmentRoomsByIds(roomIds),
    repo.listBookingAssignmentUnitsByIds(unitIds),
  ]);

  return {
    roomsById: new Map(
      rooms.map((room) => [room.id, formatBookingRoomAssignmentLabel(room)]),
    ),
    unitsById: new Map(
      units.map((unit) => [unit.id, formatBookingUnitAssignmentLabel(unit)]),
    ),
  };
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

const assertExpectedBookingVersion = (
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

const assertTransactionalRoomsAvailable = async (
  tx: Prisma.TransactionClient,
  booking: repo.DashboardBookingRecord,
  roomIds: string[],
  requireInspected: boolean,
) => {
  const rooms = await tx.room.findMany({
    where: { id: { in: roomIds } },
    include: { unit: true },
  });

  if (rooms.length !== new Set(roomIds).size) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "One or more rooms were not found");
  }

  for (const room of rooms) {
    if (room.unit.propertyId !== booking.propertyId) {
      throw new HttpError(
        400,
        "INVALID_ROOM",
        "Room does not belong to the selected property",
      );
    }

    if (
      !room.isActive ||
      !room.unit.isActive ||
      room.status !== RoomStatus.AVAILABLE ||
      room.unit.status !== UnitStatus.ACTIVE
    ) {
      throw new HttpError(
        409,
        "ROOM_NOT_AVAILABLE",
        "Selected room is not operationally available",
      );
    }

    if (
      requireInspected &&
      room.housekeepingStatus !== RoomHousekeepingStatus.INSPECTED
    ) {
      throw new HttpError(
        409,
        "ROOM_NOT_INSPECTED",
        `Room ${room.number} must be inspected before check-in`,
      );
    }

    const [bookingConflict, maintenanceConflict] = await Promise.all([
      tx.bookingItem.count({
        where: {
          OR: [
            { targetType: BookingTargetType.ROOM, roomId: room.id },
            { targetType: BookingTargetType.UNIT, unitId: room.unitId },
          ],
          booking: {
            id: { not: booking.id },
            status: {
              notIn: [
                BookingStatus.CANCELLED,
                BookingStatus.CHECKED_OUT,
                BookingStatus.NO_SHOW,
              ],
            },
            checkIn: { lt: booking.checkOut },
            checkOut: { gt: booking.checkIn },
          },
        },
      }),
      tx.maintenanceBlock.count({
        where: {
          propertyId: booking.propertyId,
          status: { notIn: ["RESOLVED", "CANCELLED"] },
          startDate: { lt: booking.checkOut },
          endDate: { gt: booking.checkIn },
          OR: [
            { targetType: "PROPERTY" },
            { targetType: "UNIT", unitId: room.unitId },
            { targetType: "ROOM", roomId: room.id },
          ],
        },
      }),
    ]);

    if (bookingConflict > 0 || maintenanceConflict > 0) {
      throw new HttpError(
        409,
        "ROOM_NOT_AVAILABLE",
        `Room ${room.number} is no longer available for this stay`,
      );
    }
  }

  return rooms;
};

const updateVersionedBooking = async (
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

const createOperationEvent = (
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

const createStatusHistory = (
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

const findTransactionBooking = async (
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
  const selectedRoomIds =
    input.roomIds ??
    initialBooking.items
      .map((item) => item.roomId)
      .filter((roomId): roomId is string => roomId !== null);
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

    if (selectedRoomIds.length !== booking.items.length) {
      throw new HttpError(
        422,
        "BOOKING_ASSIGNMENT_REQUIRED",
        "Assign a concrete room for every booking item before check-in",
      );
    }
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

const getLocalIsoDate = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
};

const dateOnlyDiff = (from: string, to: string) =>
  Math.max(
    0,
    Math.round(
      (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
        86_400_000,
    ),
  );

const moneyDecimal = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

const buildRoomMovePricingPreview = async (
  booking: repo.DashboardBookingRecord,
  roomIds: string[],
  tx: Prisma.TransactionClient,
): Promise<BookingRoomMovePreviewDTO> => {
  const rooms = await tx.room.findMany({
    where: { id: { in: roomIds } },
    include: { unit: true },
  });
  if (rooms.length !== new Set(roomIds).size) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "One or more rooms were not found");
  }

  const timeZone = booking.property.tenant.timezone;
  const checkInDate = getLocalIsoDate(booking.checkIn, timeZone);
  const checkOutDate = getLocalIsoDate(booking.checkOut, timeZone);
  const today = getLocalIsoDate(new Date(), timeZone);
  const effectiveDate =
    booking.status === BookingStatus.CHECKED_IN && today > checkInDate
      ? today
      : checkInDate;
  const effectiveDateStart = new Date(`${effectiveDate}T00:00:00.000Z`);
  const affectedNights = dateOnlyDiff(effectiveDate, checkOutDate);
  if (affectedNights <= 0) {
    throw new HttpError(
      409,
      "ROOM_MOVE_PRICING_CLOSED",
      "No remaining nights are available for repricing",
    );
  }

  const isUnitBooking = booking.targetType === BookingTargetType.UNIT;
  const orderedRooms = roomIds.map((id) => rooms.find((room) => room.id === id)!);
  const destinationUnitCapacity = orderedRooms.reduce(
    (total, room) => total + Math.max(0, room.maxOccupancy),
    0,
  );
  const pricingTargets = isUnitBooking
    ? [
        {
          item: booking.items[0],
          room: orderedRooms[0],
          targetType: BookingTargetType.UNIT,
        },
      ]
    : booking.items.map((item, index) => ({
        item,
        room: orderedRooms[index],
        targetType: BookingTargetType.ROOM,
      }));

  let currentNightlyRate = new Prisma.Decimal(0);
  let destinationNightlyRate = new Prisma.Decimal(0);
  let baseDifference = new Prisma.Decimal(0);
  let taxDifference = new Prisma.Decimal(0);
  const taxBreakdown: BookingRoomMovePreviewDTO["taxBreakdown"] = [];
  const pricingSnapshot: Array<Record<string, string>> = [];

  for (const target of pricingTargets) {
    if (!target.item || !target.room) {
      throw new HttpError(
        422,
        "ROOM_ASSIGNMENT_COUNT_MISMATCH",
        "Selected rooms do not match booking items",
      );
    }
    const pricingRows = await tx.roomPricing.findMany({
      where: {
        propertyId: booking.propertyId,
        validFrom: { lte: effectiveDateStart },
        AND: [
          { OR: [{ validTo: null }, { validTo: { gte: booking.checkOut } }] },
          { OR: [{ maxNights: null }, { maxNights: { gte: affectedNights } }] },
          ...(target.targetType === BookingTargetType.UNIT
            ? [
                {
                  OR: [
                    { roomId: null, unitId: target.room.unitId },
                    { roomId: null, unitId: null },
                  ],
                },
              ]
            : [
                {
                  OR: [
                    { roomId: target.room.id },
                    { roomId: null, unitId: target.room.unitId },
                    { roomId: null, unitId: null },
                  ],
                },
              ]),
        ],
        minNights: { lte: affectedNights },
        product: {
          occupancy:
            target.targetType === BookingTargetType.UNIT
              ? destinationUnitCapacity
              : target.item.guestCount,
          hasAC: target.item.comfortOption === "AC",
        },
      },
      orderBy: { price: "asc" },
    });
    const pricing = pricingRows.sort((left, right) => {
      const rank = (row: (typeof pricingRows)[number]) =>
        row.roomId !== null ? 0 : row.unitId !== null ? 1 : 2;
      return rank(left) - rank(right) || Number(left.price) - Number(right.price);
    })[0];
    if (!pricing) {
      throw new HttpError(
        422,
        "PRICE_NOT_CONFIGURED",
        target.targetType === BookingTargetType.UNIT
          ? `No active price is configured for unit ${target.room.unit.unitNumber} at capacity ${destinationUnitCapacity}`
          : `No active price is configured for room ${target.room.number}`,
      );
    }

    const oldRate = moneyDecimal(target.item.pricePerNight);
    const newRate = moneyDecimal(pricing.price);
    const positiveNightlyDifference = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      newRate.minus(oldRate),
    );
    const lineDifference = moneyDecimal(
      positiveNightlyDifference.times(affectedNights),
    );
    currentNightlyRate = currentNightlyRate.plus(oldRate);
    destinationNightlyRate = destinationNightlyRate.plus(newRate);
    baseDifference = baseDifference.plus(lineDifference);

    if (lineDifference.greaterThan(0)) {
      let lineTaxDifference = new Prisma.Decimal(0);
      const taxes = await tx.tax.findMany({
        where: {
          propertyId: booking.propertyId,
          isActive: true,
          validFrom: { lte: new Date(`${effectiveDate}T23:59:59.999Z`) },
          OR: [{ validTo: null }, { validTo: { gte: new Date(`${effectiveDate}T00:00:00.000Z`) } }],
          targetType: { in: [TaxTargetType.ALL, target.targetType as TaxTargetType] },
        },
      });
      const gst = taxes
        .filter(
          (tax) =>
            tax.category === TaxCategory.GST &&
            tax.calculationMode ===
              TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
            newRate.greaterThanOrEqualTo(tax.minTariff ?? 0) &&
            (tax.maxTariff === null || newRate.lessThan(tax.maxTariff)),
        )
        .sort((left, right) => right.priority - left.priority)[0];
      const applicableTaxes = [
        ...(gst ? [gst] : []),
        ...taxes.filter(
          (tax) =>
            tax.category === TaxCategory.GENERIC &&
            tax.calculationMode === TaxCalculationMode.FLAT,
        ),
      ];
      for (const tax of applicableTaxes) {
        const rate = new Prisma.Decimal(tax.rate);
        const amount =
          tax.taxType === TaxType.PERCENTAGE
            ? pricing.taxInclusive
              ? lineDifference.times(rate).div(new Prisma.Decimal(100).plus(rate))
              : lineDifference.times(rate).div(100)
            : Prisma.Decimal.min(rate, lineDifference);
        const rounded = moneyDecimal(amount);
        if (!pricing.taxInclusive) {
          lineTaxDifference = lineTaxDifference.plus(rounded);
        }
        taxBreakdown.push({
          taxId: tax.id,
          name: tax.name,
          rate: Number(tax.rate),
          amount: rounded.toString(),
        });
      }
      taxDifference = taxDifference.plus(lineTaxDifference);
    }
    pricingSnapshot.push({
      itemId: target.item.id,
      roomId: target.room.id,
      pricingId: pricing.id,
      oldRate: oldRate.toString(),
      newRate: newRate.toString(),
    });
  }

  baseDifference = moneyDecimal(baseDifference);
  taxDifference = moneyDecimal(taxDifference);
  const totalAdjustment = moneyDecimal(baseDifference.plus(taxDifference));
  const destinationAssignment = isUnitBooking
    ? `Unit ${orderedRooms[0]?.unit.unitNumber ?? ""}`
    : orderedRooms
        .map((room) => `Unit ${room.unit.unitNumber} / Room ${room.number}`)
        .join(", ");
  const fingerprintPayload = {
    bookingId: booking.id,
    bookingVersion: booking.version,
    effectiveDate,
    affectedNights,
    roomIds: [...roomIds].sort(),
    pricingSnapshot,
    baseDifference: baseDifference.toString(),
    taxDifference: taxDifference.toString(),
    totalAdjustment: totalAdjustment.toString(),
    taxBreakdown,
  };
  const pricingFingerprint = createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex");

  return {
    bookingId: booking.id,
    bookingVersion: booking.version,
    effectiveDate,
    affectedNights,
    currentAssignment: booking.targetLabel,
    destinationAssignment,
    currentNightlyRate: moneyDecimal(currentNightlyRate).toString(),
    destinationNightlyRate: moneyDecimal(destinationNightlyRate).toString(),
    baseDifference: baseDifference.toString(),
    taxDifference: taxDifference.toString(),
    totalAdjustment: totalAdjustment.toString(),
    pricingFingerprint,
    pricingRequired: totalAdjustment.greaterThan(0),
    allowedPricingActions: totalAdjustment.greaterThan(0)
      ? ["CHARGE_DIFFERENCE", "COMPLIMENTARY_UPGRADE"]
      : ["CHARGE_DIFFERENCE"],
    taxBreakdown,
  };
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
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
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
        bookingId,
        propertyId: booking.propertyId,
        createdByUserId: actor.id,
        type: input.type,
        description: input.description,
        amount: input.amount,
        ...(input.note !== undefined && { note: input.note }),
      },
    });
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {});
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.FOLIO_CHARGE,
      ...(input.note !== undefined && { note: input.note }),
      metadata: {
        chargeId: charge.id,
        type: input.type,
        amount: input.amount,
        description: input.description,
      },
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
    const booking = await findTransactionBooking(tx, bookingId);
    assertExpectedBookingVersion(booking.version, input.expectedVersion);
    const charge = await tx.bookingFolioCharge.findFirst({
      where: { id: chargeId, bookingId, status: FolioChargeStatus.ACTIVE },
    });
    if (!charge) {
      throw new HttpError(
        404,
        "FOLIO_CHARGE_NOT_FOUND",
        "Active folio charge not found",
      );
    }
    await tx.bookingFolioCharge.update({
      where: { id: chargeId },
      data: {
        status: FolioChargeStatus.VOID,
        voidReason: input.reason,
        voidedAt: new Date(),
        voidedByUserId: actor.id,
      },
    });
    await updateVersionedBooking(tx, bookingId, input.expectedVersion, {});
    await createOperationEvent(tx, {
      bookingId,
      propertyId: booking.propertyId,
      actorUserId: actor.id,
      eventType: BookingOperationEventType.FOLIO_CHARGE_VOID,
      note: input.reason,
      metadata: { chargeId, amount: charge.amount.toString() },
    });
    return mapTransactionBooking(tx, bookingId);
  });
};

const toLocalBusinessDateValue = (date: Date, timeZone: string) =>
  getLocalDateValue(date, timeZone);

const getTimeZoneOffset = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localTimestamp = Date.UTC(
    getPart("year"),
    getPart("month") - 1,
    getPart("day"),
    getPart("hour"),
    getPart("minute"),
    getPart("second"),
  );
  return localTimestamp - date.getTime();
};

const toBusinessDateBoundary = (date: Date, timeZone: string) => {
  const localMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const initial = new Date(localMidnight);
  const firstPass = new Date(localMidnight - getTimeZoneOffset(initial, timeZone));
  return new Date(localMidnight - getTimeZoneOffset(firstPass, timeZone));
};

const getRefundRecordedByUserId = (metadata: Prisma.JsonValue) => {
  if (
    metadata === null ||
    Array.isArray(metadata) ||
    typeof metadata !== "object"
  ) {
    return null;
  }
  const recordedByUserId = metadata.recordedByUserId;
  return typeof recordedByUserId === "string" && recordedByUserId.length > 0
    ? recordedByUserId
    : null;
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
  const targetDate = toLocalBusinessDateValue(
    businessDate,
    property.tenant.timezone,
  );
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
  const byId = new Map(mapped.map((booking) => [booking.id, booking]));
  const arrivals = bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CONFIRMED &&
        toLocalBusinessDateValue(booking.checkIn, property.tenant.timezone) ===
          targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const departures = bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CHECKED_IN &&
        toLocalBusinessDateValue(booking.checkOut, property.tenant.timezone) ===
          targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const inHouse = bookings
    .filter((booking) => booking.status === BookingStatus.CHECKED_IN)
    .map((booking) => byId.get(booking.id)!);
  const lateArrivals = bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CONFIRMED &&
        toLocalBusinessDateValue(booking.checkIn, property.tenant.timezone) <
          targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const unassignedArrivals = arrivals.filter(
    (booking) =>
      booking.items.length === 0 ||
      booking.items.some((item) => item.roomId === null),
  );
  const balanceDue = mapped.filter(
    (booking) =>
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.NO_SHOW &&
      Number(booking.balanceAmount) > 0,
  );
  const refundAttention = mapped.filter(
    (booking) =>
      booking.refundRequest?.status === BookingRefundRequestStatus.REQUESTED ||
      booking.refundRequest?.status === BookingRefundRequestStatus.IN_REVIEW,
  );
  const housekeeping = rooms
    .filter(
      (room) =>
        room.housekeepingStatus !== RoomHousekeepingStatus.INSPECTED,
    )
    .map((room) => ({
      roomId: room.id,
      roomNumber: room.number,
      roomName: room.name,
      unitId: room.unitId,
      unitNumber: room.unit.unitNumber,
      floor: room.unit.floor,
      status: room.housekeepingStatus,
    }));
  const maintenanceConflicts = maintenanceBlocks.flatMap((block) => {
    const affected = bookings.filter((booking) => {
      if (
        booking.status !== BookingStatus.CONFIRMED &&
        booking.status !== BookingStatus.CHECKED_IN
      ) {
        return false;
      }
      if (!(booking.checkIn < block.endDate && booking.checkOut > block.startDate)) {
        return false;
      }
      return booking.items.some((item) => {
        if (block.targetType === "PROPERTY") return true;
        if (block.targetType === "UNIT") return item.unitId === block.unitId;
        return item.roomId === block.roomId;
      });
    });
    return affected.map((booking) => ({
      maintenanceId: block.id,
      priority: block.priority,
      reason: block.reason,
      booking: byId.get(booking.id)!,
    }));
  });

  return {
    propertyId,
    propertyName: property.name,
    timezone: property.tenant.timezone,
    businessDate: businessDate.toISOString(),
    summary: {
      arrivals: arrivals.length,
      departures: departures.length,
      inHouse: inHouse.length,
      lateArrivals: lateArrivals.length,
      unassignedArrivals: unassignedArrivals.length,
      balanceDue: balanceDue.length,
      refundAttention: refundAttention.length,
      housekeeping: housekeeping.length,
      maintenanceConflicts: maintenanceConflicts.length,
    },
    arrivals,
    departures,
    inHouse,
    lateArrivals,
    unassignedArrivals,
    balanceDue,
    refundAttention,
    housekeeping,
    maintenanceConflicts,
  };
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

  const rows = new Map<
    string,
    {
      receivedByUserId: string | null;
      receivedByName: string;
      byMethod: Record<string, number>;
      refunds: number;
      cashRefunds: number;
      history: Array<{
        id: string;
        bookingId: string;
        bookingRef: string;
        guestName: string;
        amount: number;
        type: "PAYMENT" | "REFUND";
        method: PaymentMethod;
        time: Date;
      }>;
    }
  >();
  const rowFor = (id: string | null, name: string) => {
    const key = id ?? "SYSTEM";
    const existing = rows.get(key);
    if (existing) return existing;
    const created = {
      receivedByUserId: id,
      receivedByName: name,
      byMethod: {} as Record<string, number>,
      refunds: 0,
      cashRefunds: 0,
      history: [] as Array<{
        id: string;
        bookingId: string;
        bookingRef: string;
        guestName: string;
        amount: number;
        type: "PAYMENT" | "REFUND";
        method: PaymentMethod;
        time: Date;
      }>,
    };
    rows.set(key, created);
    return created;
  };

  const refundActorIds = Array.from(
    new Set(
      refunds
        .map((refund) => getRefundRecordedByUserId(refund.metadata))
        .filter((id): id is string => id !== null),
    ),
  );
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

  for (const payment of payments) {
    const row = rowFor(
      payment.receivedByUserId,
      payment.receivedBy?.fullName ?? "Online / System",
    );
    row.byMethod[payment.method] =
      (row.byMethod[payment.method] ?? 0) + Number(payment.amount);
    row.history.push({
      id: payment.id,
      bookingId: payment.bookingId,
      bookingRef: payment.booking.bookingRef,
      guestName: payment.booking.guestNameSnapshot,
      amount: Number(payment.amount),
      type: "PAYMENT",
      method: payment.method,
      time: payment.paidAt ?? payment.createdAt,
    });
  }
  for (const refund of refunds) {
    const recordedByUserId = getRefundRecordedByUserId(refund.metadata);
    // Legacy refunds have no processor metadata, so retain the payment receiver.
    const row = rowFor(
      recordedByUserId ?? refund.payment.receivedByUserId,
      (recordedByUserId
        ? refundActorNames.get(recordedByUserId)
        : refund.payment.receivedBy?.fullName) ?? "Online / System",
    );
    row.refunds += Number(refund.amount);
    if (refund.method === PaymentMethod.CASH) {
      row.cashRefunds += Number(refund.amount);
    }
    row.history.push({
      id: refund.id,
      bookingId: refund.bookingId,
      bookingRef: refund.booking.bookingRef,
      guestName: refund.booking.guestNameSnapshot,
      amount: Number(refund.amount),
      type: "REFUND",
      method: refund.method,
      time: refund.processedAt ?? refund.createdAt,
    });
  }

  return {
    propertyId,
    from: rangeStart.toISOString(),
    to: rangeEnd.toISOString(),
    rows: Array.from(rows.values()).map((row) => {
      const collected = Object.values(row.byMethod).reduce(
        (sum, amount) => sum + amount,
        0,
      );
      const cashCollected = row.byMethod[PaymentMethod.CASH] ?? 0;
      row.history.sort((a, b) => b.time.getTime() - a.time.getTime());
      const { cashRefunds, ...publicRow } = row;

      return {
        ...publicRow,
        collected,
        netCollected: collected - row.refunds,
        expectedCash: cashCollected - cashRefunds,
      };
    }),
  };
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

const getRefundPaymentStatus = (booking: repo.DashboardBookingRecord) => {
  const paidAmount = getBookingPaidAmount(booking);
  const refundedAmount = getBookingRefundedAmount(booking);

  if (paidAmount.greaterThan(0) && refundedAmount.greaterThanOrEqualTo(paidAmount)) {
    return BookingPaymentStatus.REFUNDED;
  }

  if (paidAmount.lessThanOrEqualTo(0)) {
    return BookingPaymentStatus.PENDING;
  }

  if (paidAmount.lessThan(booking.totalAmount)) {
    return BookingPaymentStatus.PARTIALLY_PAID;
  }

  return BookingPaymentStatus.PAID;
};

const assertRefundProviderAvailable = (
  provider: PaymentProvider,
  method: RecordDashboardBookingRefundInput["method"],
) => {
  if (provider === PaymentProvider.MANUAL) {
    if (method === "ONLINE_GATEWAY") {
      throw new HttpError(
        422,
        "REFUND_METHOD_MISMATCH",
        "Manual payments must be refunded with a manual refund method",
      );
    }

    return;
  }

  if (method !== "ONLINE_GATEWAY") {
    throw new HttpError(
      422,
      "REFUND_METHOD_MISMATCH",
      "Gateway payments must be refunded through the original gateway",
    );
  }

  throw new HttpError(
    501,
    "REFUND_PROVIDER_NOT_CONFIGURED",
    "Gateway refund adapter is not configured yet",
  );
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
