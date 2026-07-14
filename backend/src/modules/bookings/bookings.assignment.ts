import { createHash } from "node:crypto";
import { prisma } from "@/db/prisma.js";
import {
  BookingStatus,
  BookingTargetType,
  Prisma,
  RoomHousekeepingStatus,
  RoomStatus,
  TaxCalculationMode,
  TaxCategory,
  TaxTargetType,
  TaxType,
  UnitStatus,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type {
  BookingRoomMovePreviewDTO,
  BookingStayExtensionChargePreviewDTO,
} from "./bookings.dto.js";
import { defaultBookingPolicyCreateData } from "@/modules/booking-policy/booking-policy.policy.js";
import { buildStayPolicySnapshot } from "@/modules/booking-policy/stay-policy.js";
import {
  getLocalDateValue,
  isAdminOverrideRole,
  requireAuditNote,
} from "./bookings.helper.js";
import type { DashboardActor } from "./bookings.access.js";
import type {
  MoveBookingRoomInput,
  UpdateDashboardBookingInput,
} from "./bookings.inputs.js";
import {
  formatBookingRoomAssignmentLabel,
  formatBookingUnitAssignmentLabel,
} from "./bookings.mapper.js";
import * as repo from "./bookings.repository.js";

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

export type BookingRoomAssignmentResolution = {
  bookingData: Prisma.BookingUpdateInput;
  assignments: Array<{
    itemId: string;
    data: Prisma.BookingItemUpdateInput;
  }>;
};

export const assertBookingHasAssignedTarget = (
  booking: repo.DashboardBookingRecord,
) => {
  const hasAssignedItems = booking.items.every(
    (item) => item.roomId !== null || item.unitId !== null,
  );

  if (booking.items.length === 0 || !hasAssignedItems) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Assign a room or unit before check-in",
    );
  }
};

export const hasExistingAssignment = (booking: repo.DashboardBookingRecord) =>
  booking.roomId !== null ||
  booking.unitId !== null ||
  booking.items.some((item) => item.roomId !== null || item.unitId !== null);

export const assertComplimentaryUpgradeAllowed = (
  actor: DashboardActor,
  input: MoveBookingRoomInput,
  pricingPreview: BookingRoomMovePreviewDTO,
) => {
  if (
    (input.pricingAction !== "COMPLIMENTARY_UPGRADE" &&
      input.pricingAction !== "NO_CREDIT") ||
    !pricingPreview.pricingRequired
  ) {
    return;
  }

  if (!isAdminOverrideRole(actor.role)) {
    throw new HttpError(
      403,
      "ROOM_MOVE_WAIVER_RESTRICTED",
      "Only Admin or Super Admin can waive a room-move price difference",
    );
  }

  requireAuditNote(
    input.note,
    "Audit note is required to waive a room-move price difference",
  );
};

export const getAssignedCheckInRoomIds = async (
  tx: Prisma.TransactionClient,
  booking: repo.DashboardBookingRecord,
) => {
  assertBookingHasAssignedTarget(booking);

  const roomIds = new Set<string>();
  const unitIds = new Set<string>();

  for (const item of booking.items) {
    if (item.roomId !== null) {
      roomIds.add(item.roomId);
      continue;
    }

    if (item.unitId !== null) {
      unitIds.add(item.unitId);
    }
  }

  if (unitIds.size > 0) {
    const units = await tx.unit.findMany({
      where: { id: { in: [...unitIds] } },
      include: {
        rooms: {
          orderBy: { number: "asc" },
        },
      },
    });

    if (units.length !== unitIds.size) {
      throw new HttpError(
        422,
        "BOOKING_ASSIGNMENT_REQUIRED",
        "Assign a room or unit before check-in",
      );
    }

    for (const unit of units) {
      for (const room of unit.rooms) {
        roomIds.add(room.id);
      }
    }
  }

  if (roomIds.size === 0) {
    throw new HttpError(
      422,
      "BOOKING_ASSIGNMENT_REQUIRED",
      "Assign a concrete room before check-in",
    );
  }

  return [...roomIds];
};

export const resolveBookingRoomAssignments = async (
  booking: repo.DashboardBookingRecord,
  roomIds: string[],
  options: {
    forceConcreteRooms?: boolean;
    allowLateAssignment?: boolean;
  } = {},
): Promise<BookingRoomAssignmentResolution> => {
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
        const targetLabel = unit
          ? formatBookingUnitAssignmentLabel(unit)
          : `Unit ${assignedRoom.unit.unitNumber}`;
        return {
          itemId: item.id,
          data: {
            targetType: BookingTargetType.UNIT,
            unitId: assignedRoom.unitId,
            roomId: null,
            targetLabel,
            capacity:
              unit?.rooms.reduce((sum, r) => sum + r.maxOccupancy, 0) ??
              assignedRoom.maxOccupancy,
          } satisfies Prisma.BookingItemUpdateInput,
        };
      }

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
    }),
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
    const targetLabel = unit
      ? formatBookingUnitAssignmentLabel(unit)
      : `Unit ${firstRoom.unit.unitNumber}`;
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

export const resolveDashboardBookingUpdateAssignment = async (
  booking: repo.DashboardBookingRecord,
  actor: Pick<DashboardActor, "role">,
  input: UpdateDashboardBookingInput,
) => {
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

  return assignment;
};

const uniqueIds = (ids: Array<string | null | undefined>) =>
  Array.from(
    new Set(ids.filter((id): id is string => id !== null && id !== undefined)),
  );

export const getBookingAssignmentLabels = async (
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

export const assertTransactionalRoomsAvailable = async (
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
      (Date.parse(`${to}T00:00:00.000Z`) -
        Date.parse(`${from}T00:00:00.000Z`)) /
        86_400_000,
    ),
  );

const moneyDecimal = (value: Prisma.Decimal | number | string) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

type AssignmentRoom = Prisma.RoomGetPayload<{ include: { unit: true } }>;

type EffectivePricingTarget = {
  item: repo.DashboardBookingRecord["items"][number];
  room: AssignmentRoom;
  targetType: BookingTargetType;
  occupancy: number;
};

const getPricingRank = (row: { roomId: string | null; unitId: string | null }) =>
  row.roomId !== null ? 0 : row.unitId !== null ? 1 : 2;

const findEffectivePricing = async (
  tx: Prisma.TransactionClient,
  input: {
    booking: repo.DashboardBookingRecord;
    target: EffectivePricingTarget;
    effectiveDate: string;
    pricingThroughDate: Date;
    nights: number;
  },
) => {
  const effectiveDateStart = new Date(`${input.effectiveDate}T00:00:00.000Z`);
  const pricingRows = await tx.roomPricing.findMany({
    where: {
      propertyId: input.booking.propertyId,
      validFrom: { lte: effectiveDateStart },
      AND: [
        {
          OR: [
            { validTo: null },
            { validTo: { gte: input.pricingThroughDate } },
          ],
        },
        { OR: [{ maxNights: null }, { maxNights: { gte: input.nights } }] },
        ...(input.target.targetType === BookingTargetType.UNIT
          ? [
              {
                OR: [
                  { roomId: null, unitId: input.target.room.unitId },
                  { roomId: null, unitId: null },
                ],
              },
            ]
          : [
              {
                OR: [
                  { roomId: input.target.room.id },
                  { roomId: null, unitId: input.target.room.unitId },
                  { roomId: null, unitId: null },
                ],
              },
            ]),
      ],
      minNights: { lte: input.nights },
      product: {
        occupancy: input.target.occupancy,
        hasAC: input.target.item.comfortOption === "AC",
      },
    },
    orderBy: { price: "asc" },
  });

  const pricing = pricingRows.sort(
    (left, right) =>
      getPricingRank(left) - getPricingRank(right) ||
      Number(left.price) - Number(right.price),
  )[0];

  if (!pricing) {
    throw new HttpError(
      422,
      "PRICE_NOT_CONFIGURED",
      input.target.targetType === BookingTargetType.UNIT
        ? `No active price is configured for unit ${input.target.room.unit.unitNumber} at capacity ${input.target.occupancy}`
        : `No active price is configured for room ${input.target.room.number}`,
    );
  }

  return pricing;
};

const getApplicablePricingTaxes = async (
  tx: Prisma.TransactionClient,
  input: {
    booking: repo.DashboardBookingRecord;
    targetType: BookingTargetType;
    effectiveDate: string;
    nightlyRate: Prisma.Decimal;
  },
) => {
  const taxes = await tx.tax.findMany({
    where: {
      propertyId: input.booking.propertyId,
      isActive: true,
      validFrom: { lte: new Date(`${input.effectiveDate}T23:59:59.999Z`) },
      OR: [
        { validTo: null },
        { validTo: { gte: new Date(`${input.effectiveDate}T00:00:00.000Z`) } },
      ],
      targetType: {
        in: [TaxTargetType.ALL, input.targetType as TaxTargetType],
      },
    },
  });
  const gst = taxes
    .filter(
      (tax) =>
        tax.category === TaxCategory.GST &&
        tax.calculationMode ===
          TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
        input.nightlyRate.greaterThanOrEqualTo(tax.minTariff ?? 0) &&
        (tax.maxTariff === null || input.nightlyRate.lessThan(tax.maxTariff)),
    )
    .sort((left, right) => right.priority - left.priority)[0];

  return [
    ...(gst ? [gst] : []),
    ...taxes.filter(
      (tax) =>
        tax.category === TaxCategory.GENERIC &&
        tax.calculationMode === TaxCalculationMode.FLAT,
    ),
  ];
};

const getTaxAmountForLine = async (
  tx: Prisma.TransactionClient,
  input: {
    booking: repo.DashboardBookingRecord;
    targetType: BookingTargetType;
    effectiveDate: string;
    nightlyRate: Prisma.Decimal;
    taxableAmount: Prisma.Decimal;
    taxInclusive: boolean;
  },
) => {
  let exclusiveTaxAmount = new Prisma.Decimal(0);
  const taxBreakdown: BookingRoomMovePreviewDTO["taxBreakdown"] = [];
  const taxes = await getApplicablePricingTaxes(tx, input);

  for (const tax of taxes) {
    const rate = new Prisma.Decimal(tax.rate);
    const amount =
      tax.taxType === TaxType.PERCENTAGE
        ? input.taxInclusive
          ? input.taxableAmount.times(rate).div(new Prisma.Decimal(100).plus(rate))
          : input.taxableAmount.times(rate).div(100)
        : Prisma.Decimal.min(rate, input.taxableAmount);
    const rounded = moneyDecimal(amount);
    if (!input.taxInclusive) {
      exclusiveTaxAmount = exclusiveTaxAmount.plus(rounded);
    }
    taxBreakdown.push({
      taxId: tax.id,
      name: tax.name,
      rate: Number(tax.rate),
      amount: rounded.toString(),
    });
  }

  return {
    exclusiveTaxAmount,
    taxBreakdown,
  };
};

const buildCurrentPricingTargets = async (
  booking: repo.DashboardBookingRecord,
  tx: Prisma.TransactionClient,
) => {
  const isUnitBooking = booking.targetType === BookingTargetType.UNIT;
  const roomIds = uniqueIds([
    booking.roomId,
    ...booking.items.map((item) => item.roomId),
  ]);
  const unitIds = uniqueIds([
    booking.unitId,
    ...booking.items.map((item) => item.unitId),
  ]);

  const rooms = await tx.room.findMany({
    where: {
      OR: [
        ...(roomIds.length > 0 ? [{ id: { in: roomIds } }] : []),
        ...(unitIds.length > 0 ? [{ unitId: { in: unitIds } }] : []),
      ],
    },
    include: { unit: true },
    orderBy: { number: "asc" },
  });
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const roomsByUnitId = new Map<string, AssignmentRoom[]>();
  for (const room of rooms) {
    const unitRooms = roomsByUnitId.get(room.unitId) ?? [];
    unitRooms.push(room);
    roomsByUnitId.set(room.unitId, unitRooms);
  }

  if (isUnitBooking) {
    const item = booking.items[0];
    const unitId = item?.unitId ?? booking.unitId;
    const unitRooms = unitId ? roomsByUnitId.get(unitId) ?? [] : [];
    const room = unitRooms[0];
    if (!item || !room) {
      throw new HttpError(
        422,
        "BOOKING_ASSIGNMENT_REQUIRED",
        "Booking must have assigned rooms before pricing a move",
      );
    }
    return [
      {
        item,
        room,
        targetType: BookingTargetType.UNIT,
        occupancy: unitRooms.reduce(
          (total, unitRoom) => total + Math.max(0, unitRoom.maxOccupancy),
          0,
        ),
      },
    ] satisfies EffectivePricingTarget[];
  }

  return booking.items.map((item) => {
    if (item.roomId === null) {
      throw new HttpError(
        422,
        "BOOKING_ASSIGNMENT_REQUIRED",
        "Booking must have assigned rooms before pricing a move",
      );
    }

    const room = roomsById.get(item.roomId);
    if (!room) {
      throw new HttpError(404, "ROOM_NOT_FOUND", "Assigned room was not found");
    }

    return {
      item,
      room,
      targetType: BookingTargetType.ROOM,
      occupancy: item.guestCount,
    };
  }) satisfies EffectivePricingTarget[];
};

export const buildRoomMovePricingPreview = async (
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
        occupancy: Math.max(1, orderedRooms[index]?.maxOccupancy ?? item.guestCount),
      }));
  const currentPricingTargets = await buildCurrentPricingTargets(booking, tx);

  let currentNightlyRate = new Prisma.Decimal(0);
  let destinationNightlyRate = new Prisma.Decimal(0);
  let baseDifference = new Prisma.Decimal(0);
  let taxDifference = new Prisma.Decimal(0);
  const taxBreakdown: BookingRoomMovePreviewDTO["taxBreakdown"] = [];
  const pricingSnapshot: Array<Record<string, string>> = [];

  for (const [index, target] of pricingTargets.entries()) {
    const currentTarget = currentPricingTargets[index];
    if (!target.item || !target.room || !currentTarget) {
      throw new HttpError(
        422,
        "ROOM_ASSIGNMENT_COUNT_MISMATCH",
        "Selected rooms do not match booking items",
      );
    }

    const destinationPricing = await findEffectivePricing(tx, {
      booking,
      target: {
        item: target.item,
        room: target.room,
        targetType: target.targetType,
        occupancy:
          target.targetType === BookingTargetType.UNIT
            ? destinationUnitCapacity
            : Math.max(1, target.room.maxOccupancy),
      },
      effectiveDate,
      pricingThroughDate: booking.checkOut,
      nights: affectedNights,
    });

    const oldRate = moneyDecimal(target.item.pricePerNight);
    const newRate = moneyDecimal(destinationPricing.price);
    const nightlyDifference = newRate.minus(oldRate);
    const lineDifference = moneyDecimal(
      nightlyDifference.times(affectedNights),
    );
    currentNightlyRate = currentNightlyRate.plus(oldRate);
    destinationNightlyRate = destinationNightlyRate.plus(newRate);
    baseDifference = baseDifference.plus(lineDifference);

    if (!lineDifference.equals(0)) {
      const lineTax = await getTaxAmountForLine(tx, {
        booking,
        targetType: target.targetType,
        effectiveDate,
        nightlyRate: newRate,
        taxableAmount: lineDifference.abs(),
        taxInclusive: destinationPricing.taxInclusive,
      });
      const direction = lineDifference.lessThan(0) ? -1 : 1;
      taxBreakdown.push(
        ...lineTax.taxBreakdown.map((tax) => ({
          ...tax,
          amount: new Prisma.Decimal(tax.amount).times(direction).toString(),
        })),
      );
      taxDifference = taxDifference.plus(
        lineTax.exclusiveTaxAmount.times(direction),
      );
    }
    pricingSnapshot.push({
      itemId: target.item.id,
      currentRoomId: currentTarget.room.id,
      destinationRoomId: target.room.id,
      destinationPricingId: destinationPricing.id,
      currentRate: oldRate.toString(),
      destinationRate: newRate.toString(),
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
  const policy = await tx.propertyBookingPolicy.upsert({
    where: { propertyId: booking.propertyId },
    create: { propertyId: booking.propertyId, ...defaultBookingPolicyCreateData },
    update: {},
  });
  const policySnapshot = buildStayPolicySnapshot(policy);
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
    downgradePolicy: policySnapshot.downgrade,
  };
  const pricingFingerprint = createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex");

  const movementType = totalAdjustment.greaterThan(0)
    ? "UPGRADE"
    : totalAdjustment.lessThan(0)
      ? "DOWNGRADE"
      : "SAME_RATE";
  const allowedPricingActions: BookingRoomMovePreviewDTO["allowedPricingActions"] =
    movementType === "UPGRADE"
      ? ["CHARGE_DIFFERENCE", "COMPLIMENTARY_UPGRADE"]
      : movementType === "DOWNGRADE"
        ? policySnapshot.downgrade.financialTreatment === "CREDIT_DIFFERENCE"
          ? ["APPLY_CREDIT"]
          : policySnapshot.downgrade.financialTreatment === "WAIVER"
            ? ["APPLY_CREDIT", "NO_CREDIT"]
            : ["NO_CREDIT"]
        : ["NO_CREDIT"];

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
    pricingRequired: !totalAdjustment.equals(0),
    allowedPricingActions,
    movementType,
    downgradeTreatment: policySnapshot.downgrade.financialTreatment,
    policySnapshot,
    taxBreakdown,
  };
};

export const buildStayExtensionChargePreview = async (
  booking: repo.DashboardBookingRecord,
  tx: Prisma.TransactionClient,
  requestedCheckOut: Date,
): Promise<BookingStayExtensionChargePreviewDTO | null> => {
  const timeZone = booking.property.tenant.timezone;
  const originalCheckOutDate = getLocalIsoDate(booking.checkOut, timeZone);
  const actualCheckOutDate = getLocalIsoDate(requestedCheckOut, timeZone);
  const extraNights = dateOnlyDiff(originalCheckOutDate, actualCheckOutDate);

  if (extraNights <= 0) {
    return null;
  }

  const currentPricingTargets = await buildCurrentPricingTargets(booking, tx);
  const pricingThroughDate = new Date(`${actualCheckOutDate}T00:00:00.000Z`);
  let nightlyRate = new Prisma.Decimal(0);
  let baseAmount = new Prisma.Decimal(0);
  let taxAmount = new Prisma.Decimal(0);
  const taxBreakdown: BookingStayExtensionChargePreviewDTO["taxBreakdown"] = [];
  const pricingSnapshot: BookingStayExtensionChargePreviewDTO["pricingSnapshot"] = [];

  for (const target of currentPricingTargets) {
    const pricing = await findEffectivePricing(tx, {
      booking,
      target,
      effectiveDate: originalCheckOutDate,
      pricingThroughDate,
      nights: extraNights,
    });
    const lineNightlyRate = moneyDecimal(pricing.price);
    const lineBaseAmount = moneyDecimal(lineNightlyRate.times(extraNights));
    const lineTax = await getTaxAmountForLine(tx, {
      booking,
      targetType: target.targetType,
      effectiveDate: originalCheckOutDate,
      nightlyRate: lineNightlyRate,
      taxableAmount: lineBaseAmount,
      taxInclusive: pricing.taxInclusive,
    });
    nightlyRate = nightlyRate.plus(lineNightlyRate);
    baseAmount = baseAmount.plus(lineBaseAmount);
    taxAmount = taxAmount.plus(lineTax.exclusiveTaxAmount);
    taxBreakdown.push(...lineTax.taxBreakdown);
    pricingSnapshot.push({
      itemId: target.item.id,
      roomId: target.room.id,
      pricingId: pricing.id,
      nightlyRate: lineNightlyRate.toString(),
    });
  }

  baseAmount = moneyDecimal(baseAmount);
  taxAmount = moneyDecimal(taxAmount);
  const totalAmount = moneyDecimal(baseAmount.plus(taxAmount));

  return {
    extraNights,
    effectiveDate: originalCheckOutDate,
    originalCheckOutDate,
    actualCheckOutDate,
    currentAssignment: booking.targetLabel,
    nightlyRate: moneyDecimal(nightlyRate).toString(),
    baseAmount: baseAmount.toString(),
    taxAmount: taxAmount.toString(),
    totalAmount: totalAmount.toString(),
    taxBreakdown,
    pricingSnapshot,
  };
};

export const buildLateCheckoutExtensionPreview = (
  booking: repo.DashboardBookingRecord,
  tx: Prisma.TransactionClient,
  now = new Date(),
) => buildStayExtensionChargePreview(booking, tx, now);
