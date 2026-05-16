import {
  BookingStatus,
  BookingTargetType,
  MaintenanceTargetType,
  RoomStatus,
  UnitStatus,
} from "@/generated/prisma/client.js";
import type {
  DashboardRoomBoardDTO,
  DashboardRoomBoardStatus,
} from "./dashboard.dto.js";
import type * as repo from "./dashboard.repository.js";

const roomBoardStatuses: DashboardRoomBoardStatus[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "MAINTENANCE",
  "INACTIVE",
];

const getBookingBoardStatus = (
  booking: repo.DashboardRoomBoardBookingItemRecord["booking"],
): DashboardRoomBoardStatus =>
  booking.status === BookingStatus.CHECKED_IN ? "OCCUPIED" : "RESERVED";

const findRoomBoardBooking = (
  room: repo.DashboardRoomBoardRoomRecord,
  bookingItems: repo.DashboardRoomBoardBookingItemRecord[],
) =>
  bookingItems.find((item) =>
    item.targetType === BookingTargetType.UNIT
      ? item.unitId === room.unitId
      : item.roomId === room.id,
  ) ?? null;

const findRoomBoardMaintenance = (
  room: repo.DashboardRoomBoardRoomRecord,
  maintenanceBlocks: repo.DashboardRoomBoardMaintenanceRecord[],
) =>
  maintenanceBlocks.find((block) => {
    if (block.targetType === MaintenanceTargetType.PROPERTY) {
      return true;
    }
    if (block.targetType === MaintenanceTargetType.UNIT) {
      return block.unitId === room.unitId;
    }
    return block.roomId === room.id;
  }) ?? null;

const getRoomBoardStatus = (
  room: repo.DashboardRoomBoardRoomRecord,
  bookingItem: repo.DashboardRoomBoardBookingItemRecord | null,
  maintenanceBlock: repo.DashboardRoomBoardMaintenanceRecord | null,
): { status: DashboardRoomBoardStatus; reason: string | null } => {
  if (
    !room.isActive ||
    !room.unit.isActive ||
    room.unit.status === UnitStatus.INACTIVE
  ) {
    return { status: "INACTIVE", reason: "Inventory is inactive" };
  }

  if (
    room.status === RoomStatus.MAINTENANCE ||
    room.unit.status === UnitStatus.MAINTENANCE ||
    maintenanceBlock
  ) {
    return {
      status: "MAINTENANCE",
      reason: maintenanceBlock?.reason ?? "Marked for maintenance",
    };
  }

  if (bookingItem) {
    return {
      status: getBookingBoardStatus(bookingItem.booking),
      reason: `${bookingItem.booking.bookingRef} - ${bookingItem.booking.guestNameSnapshot}`,
    };
  }

  if (room.status === RoomStatus.OCCUPIED) {
    return { status: "OCCUPIED", reason: "Marked occupied" };
  }

  return { status: "AVAILABLE", reason: null };
};

interface BuildDashboardRoomBoardInput {
  propertyId: string;
  propertyName: string;
  from: Date;
  to: Date;
  rooms: repo.DashboardRoomBoardRoomRecord[];
  bookingItems: repo.DashboardRoomBoardBookingItemRecord[];
  maintenanceBlocks: repo.DashboardRoomBoardMaintenanceRecord[];
}

export const buildDashboardRoomBoard = ({
  propertyId,
  propertyName,
  from,
  to,
  rooms,
  bookingItems,
  maintenanceBlocks,
}: BuildDashboardRoomBoardInput): DashboardRoomBoardDTO => {
  const summary = roomBoardStatuses.reduce(
    (result, status) => ({
      ...result,
      [status]: 0,
    }),
    {} as Record<DashboardRoomBoardStatus, number>,
  );
  const units = new Map<string, DashboardRoomBoardDTO["units"][number]>();

  for (const room of rooms) {
    const bookingItem = findRoomBoardBooking(room, bookingItems);
    const maintenanceBlock = findRoomBoardMaintenance(room, maintenanceBlocks);
    const board = getRoomBoardStatus(room, bookingItem, maintenanceBlock);
    summary[board.status] += 1;

    const unit = units.get(room.unitId) ?? {
      unitId: room.unitId,
      unitNumber: room.unit.unitNumber,
      floor: room.unit.floor,
      status: room.unit.status,
      isActive: room.unit.isActive,
      rooms: [],
    };

    unit.rooms.push({
      roomId: room.id,
      roomNumber: room.number,
      roomName: room.name,
      unitId: room.unitId,
      unitNumber: room.unit.unitNumber,
      floor: room.unit.floor,
      hasAC: room.hasAC,
      maxOccupancy: room.maxOccupancy,
      inventoryStatus: room.status,
      isActive: room.isActive,
      boardStatus: board.status,
      reason: board.reason,
      booking: bookingItem
        ? {
            id: bookingItem.booking.id,
            bookingRef: bookingItem.booking.bookingRef,
            status: bookingItem.booking.status,
            bookingType: bookingItem.booking.bookingType,
            guestName: bookingItem.booking.guestNameSnapshot,
            guestCount: bookingItem.booking.guestCount,
            checkIn: bookingItem.booking.checkIn,
            checkOut: bookingItem.booking.checkOut,
            targetLabel: bookingItem.targetLabel,
          }
        : null,
      maintenance: maintenanceBlock
        ? {
            id: maintenanceBlock.id,
            targetType: maintenanceBlock.targetType,
            reason: maintenanceBlock.reason ?? "Maintenance block",
            startDate: maintenanceBlock.startDate,
            endDate: maintenanceBlock.endDate,
          }
        : null,
    });

    units.set(room.unitId, unit);
  }

  return {
    propertyId,
    propertyName,
    from: from.toISOString(),
    to: to.toISOString(),
    summary,
    units: [...units.values()],
  };
};
