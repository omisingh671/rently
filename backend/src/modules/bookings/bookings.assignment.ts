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
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { BookingRoomMovePreviewDTO } from "./bookings.dto.js";
import { getLocalDateValue } from "./bookings.helper.js";
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
          OR: [
            { validTo: null },
            { validTo: { gte: new Date(`${effectiveDate}T00:00:00.000Z`) } },
          ],
          targetType: {
            in: [TaxTargetType.ALL, target.targetType as TaxTargetType],
          },
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
