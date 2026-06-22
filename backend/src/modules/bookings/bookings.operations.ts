import {
  BookingRefundRequestStatus,
  BookingStatus,
  PaymentMethod,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
  RoomHousekeepingStatus,
} from "@/generated/prisma/client.js";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import { getLocalDateValue } from "./bookings.helper.js";
import { getRefundRecordedByUserId } from "./bookings.financials.js";
import type { DashboardBookingDTO } from "./bookings.dto.js";
import * as repo from "./bookings.repository.js";
import { mapDashboardBooking } from "./bookings.presenter.js";

export const toLocalBusinessDateValue = (date: Date, timeZone: string) =>
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

export const toBusinessDateBoundary = (date: Date, timeZone: string) => {
  const localMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  const initial = new Date(localMidnight);
  const firstPass = new Date(localMidnight - getTimeZoneOffset(initial, timeZone));
  return new Date(localMidnight - getTimeZoneOffset(firstPass, timeZone));
};

interface OperationsBookingRecord {
  id: string;
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
  items: Array<{
    roomId: string | null;
    unitId: string | null;
  }>;
}

interface OperationsRoomRecord {
  id: string;
  number: string;
  name: string;
  unitId: string;
  housekeepingStatus: RoomHousekeepingStatus;
  unit: {
    unitNumber: string;
    floor: number;
  };
}

interface OperationsMaintenanceRecord {
  id: string;
  priority: string;
  reason: string | null;
  targetType: string;
  unitId: string | null;
  roomId: string | null;
  startDate: Date;
  endDate: Date;
}

export const buildOperationsBoardPayload = (input: {
  propertyId: string;
  propertyName: string;
  timezone: string;
  businessDate: Date;
  bookings: OperationsBookingRecord[];
  mappedBookings: DashboardBookingDTO[];
  rooms: OperationsRoomRecord[];
  maintenanceBlocks: OperationsMaintenanceRecord[];
}) => {
  const targetDate = toLocalBusinessDateValue(
    input.businessDate,
    input.timezone,
  );
  const byId = new Map(input.mappedBookings.map((booking) => [booking.id, booking]));
  const arrivals = input.bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CONFIRMED &&
        toLocalBusinessDateValue(booking.checkIn, input.timezone) === targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const departures = input.bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CHECKED_IN &&
        toLocalBusinessDateValue(booking.checkOut, input.timezone) === targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const inHouse = input.bookings
    .filter((booking) => booking.status === BookingStatus.CHECKED_IN)
    .map((booking) => byId.get(booking.id)!);
  const lateArrivals = input.bookings
    .filter(
      (booking) =>
        booking.status === BookingStatus.CONFIRMED &&
        toLocalBusinessDateValue(booking.checkIn, input.timezone) < targetDate,
    )
    .map((booking) => byId.get(booking.id)!);
  const unassignedArrivals = arrivals.filter(
    (booking) =>
      booking.items.length === 0 ||
      booking.items.some((item) => item.roomId === null),
  );
  const balanceDue = input.mappedBookings.filter(
    (booking) =>
      booking.status !== BookingStatus.CANCELLED &&
      booking.status !== BookingStatus.NO_SHOW &&
      Number(booking.balanceAmount) > 0,
  );
  const refundAttention = input.mappedBookings.filter(
    (booking) =>
      booking.refundRequest?.status === BookingRefundRequestStatus.REQUESTED ||
      booking.refundRequest?.status === BookingRefundRequestStatus.IN_REVIEW,
  );
  const housekeeping = input.rooms
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
  const maintenanceConflicts = input.maintenanceBlocks.flatMap((block) => {
    const affected = input.bookings.filter((booking) => {
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
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    timezone: input.timezone,
    businessDate: input.businessDate.toISOString(),
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

export const buildOperationsBoardForProperty = async (
  propertyId: string,
  businessDate: Date,
) => {
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

  const mapped = await Promise.all(
    bookings.map((booking) => mapDashboardBooking(booking)),
  );
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

interface CashierBookingRecord {
  id: string;
  bookingRef: string;
  guestNameSnapshot: string;
}

interface CashierPaymentRecord {
  id: string;
  bookingId: string;
  method: PaymentMethod;
  amount: Prisma.Decimal;
  paidAt: Date | null;
  createdAt: Date;
  receivedByUserId: string | null;
  receivedBy: { fullName: string } | null;
  booking: CashierBookingRecord;
}

interface CashierRefundRecord {
  id: string;
  bookingId: string;
  method: PaymentMethod;
  amount: Prisma.Decimal;
  processedAt: Date | null;
  createdAt: Date;
  metadata: Prisma.JsonValue;
  booking: CashierBookingRecord;
  payment: {
    receivedByUserId: string | null;
    receivedBy: { fullName: string } | null;
  };
}

export const getCashierRefundActorIds = (refunds: CashierRefundRecord[]) =>
  Array.from(
    new Set(
      refunds
        .map((refund) => getRefundRecordedByUserId(refund.metadata))
        .filter((id): id is string => id !== null),
    ),
  );

export const buildCashierSummaryPayload = (input: {
  propertyId: string;
  rangeStart: Date;
  rangeEnd: Date;
  payments: CashierPaymentRecord[];
  refunds: CashierRefundRecord[];
  refundActorNames: Map<string, string>;
}) => {
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

  for (const payment of input.payments) {
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
  for (const refund of input.refunds) {
    const recordedByUserId = getRefundRecordedByUserId(refund.metadata);
    // Legacy refunds have no processor metadata, so retain the payment receiver.
    const row = rowFor(
      recordedByUserId ?? refund.payment.receivedByUserId,
      (recordedByUserId
        ? input.refundActorNames.get(recordedByUserId)
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
    propertyId: input.propertyId,
    from: input.rangeStart.toISOString(),
    to: input.rangeEnd.toISOString(),
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

export const buildCashierSummaryForProperty = async (
  propertyId: string,
  from: Date,
  to: Date,
) => {
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
