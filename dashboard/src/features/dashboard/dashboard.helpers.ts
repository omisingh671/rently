import type {
  AdminBooking,
  AdminQuote,
  RoomBoardResponse,
  RoomBoardRoom,
  RoomBoardStatus,
  RoomBoardUnit,
} from "@/features/operations/types";
import type { AdminRoomPricing } from "@/features/pricing/types";

export const DASHBOARD_BOOKINGS_LIMIT = 100;
export const RECENT_BOOKINGS_LIMIT = 6;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const todayStr = () => toDateInput(new Date());

export const tomorrowStr = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return toDateInput(next);
};

export const formatDisplayDate = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const formatAmount = (value: string) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `INR ${value}`;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getBookingStayLabel = (booking: AdminBooking) => {
  const itemCount = Math.max(booking.items.length, 1);

  if (booking.bookingType === "MULTI_ROOM" || itemCount > 1) {
    return `${itemCount}-room stay`;
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit stay" : "Room stay";
  }

  return booking.productName;
};

export const getBookingTargetSummary = (booking: AdminBooking) => {
  if (booking.items.length > 1) {
    return booking.items.map((item) => item.targetLabel).join(" + ");
  }

  if (booking.productName === "Booking option") {
    return booking.targetType === "UNIT" ? "Private unit" : "Private room";
  }

  return booking.targetLabel;
};

const dateOnly = (value: string) => value.slice(0, 10);

const startOfDate = (value: string) => new Date(`${dateOnly(value)}T00:00:00`);

const diffInDays = (from: Date, to: Date) =>
  Math.max(Math.round((to.getTime() - from.getTime()) / MS_PER_DAY), 0);

export const getBookingNightProgress = (booking: AdminBooking) => {
  const checkIn = startOfDate(booking.checkIn);
  const checkOut = startOfDate(booking.checkOut);
  const today = startOfDate(todayStr());
  const totalNights = Math.max(diffInDays(checkIn, checkOut), 1);
  const completedNights = Math.min(diffInDays(checkIn, today), totalNights);

  return `${completedNights}/${totalNights} nights`;
};

export const getGuestInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

export const getGuestAvatarTone = (name: string) => {
  const tones = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-sky-100 text-sky-700",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-700",
  ];
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return tones[seed % tones.length];
};

export const countAvailableRooms = (unit: RoomBoardUnit) =>
  unit.rooms.filter((room) => room.boardStatus === "AVAILABLE").length;

export const getTotalRooms = (board: RoomBoardResponse | undefined) => {
  if (!board) return 0;

  return Object.values(board.summary).reduce((sum, count) => sum + count, 0);
};

export const getDashboardStats = (
  board: RoomBoardResponse | undefined,
  bookings: AdminBooking[],
  today = todayStr(),
) => {
  const totalRooms = getTotalRooms(board);
  const occupiedRooms = board?.summary.OCCUPIED ?? 0;
  const occupancyRate =
    totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100);
  const todayCheckIns = bookings.filter(
    (booking) => dateOnly(booking.checkIn) === today,
  ).length;
  const todayCheckOuts = bookings.filter(
    (booking) => dateOnly(booking.checkOut) === today,
  ).length;
  const healthIssues =
    (board?.summary.MAINTENANCE ?? 0) + (board?.summary.INACTIVE ?? 0);

  return {
    occupancyRate,
    todayCheckIns,
    todayCheckOuts,
    healthIssues,
  };
};

export const statusLabel = (status: RoomBoardStatus) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");

const isSameDate = (value: string, date: string) => dateOnly(value) === date;

const isActiveStay = (booking: AdminBooking, today = todayStr()) =>
  booking.status === "CHECKED_IN" ||
  (["CONFIRMED", "CHECKED_IN"].includes(booking.status) &&
    dateOnly(booking.checkIn) <= today &&
    dateOnly(booking.checkOut) > today);

export const getTodayOperations = (
  board: RoomBoardResponse | undefined,
  bookings: AdminBooking[],
  enquiriesTotal: number,
  quotesTotal: number,
  today = todayStr(),
) => [
  {
    label: "Today Check-ins",
    value: bookings.filter((booking) => isSameDate(booking.checkIn, today))
      .length,
  },
  {
    label: "Today Check-outs",
    value: bookings.filter((booking) => isSameDate(booking.checkOut, today))
      .length,
  },
  {
    label: "Currently Staying",
    value:
      board?.summary.OCCUPIED ??
      bookings.filter((booking) => isActiveStay(booking, today)).length,
  },
  {
    label: "Pending Confirmations",
    value: bookings.filter((booking) => booking.status === "PENDING").length,
  },
  {
    label: "Pending Enquiries",
    value: enquiriesTotal,
  },
  {
    label: "Pending Quotes",
    value: quotesTotal,
  },
];

const getAllRooms = (board: RoomBoardResponse | undefined): RoomBoardRoom[] =>
  board?.units.flatMap((unit) => unit.rooms) ?? [];

const isActivePricing = (rate: AdminRoomPricing, today = todayStr()) =>
  dateOnly(rate.validFrom) <= today &&
  (!rate.validTo || dateOnly(rate.validTo) >= today);

export const getNeedsAttention = ({
  board,
  bookings,
  rates,
  quotes,
  today = todayStr(),
}: {
  board: RoomBoardResponse | undefined;
  bookings: AdminBooking[];
  rates: AdminRoomPricing[];
  quotes: AdminQuote[];
  today?: string;
}) => {
  const activeRates = rates.filter((rate) => isActivePricing(rate, today));
  const allRooms = getAllRooms(board);
  const pricedRoomIds = new Set(
    activeRates
      .map((rate) => rate.roomId)
      .filter((roomId): roomId is string => Boolean(roomId)),
  );
  const pricedUnitIds = new Set(
    activeRates
      .map((rate) => rate.unitId)
      .filter((unitId): unitId is string => Boolean(unitId)),
  );
  const roomsWithoutActivePricing = allRooms.filter(
    (room) =>
      room.isActive &&
      !pricedRoomIds.has(room.roomId) &&
      !pricedUnitIds.has(room.unitId),
  ).length;
  const disabledUnitsWithEnabledRooms =
    board?.units.filter(
      (unit) => !unit.isActive && unit.rooms.some((room) => room.isActive),
    ).length ?? 0;
  const maintenanceRoomsToday =
    board?.summary.MAINTENANCE ??
    allRooms.filter((room) => room.boardStatus === "MAINTENANCE").length;
  const pendingPayments = bookings.filter(
    (booking) =>
      booking.status === "PENDING" && Number(booking.upfrontAmount) > 0,
  ).length;
  const staleQuoteThreshold = Date.now() - 24 * 60 * 60 * 1000;
  const staleQuotes = quotes.filter(
    (quote) =>
      quote.status !== "CLOSED" &&
      new Date(quote.createdAt).getTime() < staleQuoteThreshold,
  ).length;

  return [
    {
      label: "rooms have no active pricing",
      value: roomsWithoutActivePricing,
    },
    {
      label: "disabled unit has enabled rooms",
      value: disabledUnitsWithEnabledRooms,
    },
    {
      label: "room is under maintenance today",
      value: maintenanceRoomsToday,
    },
    {
      label: "pending payments need confirmation",
      value: pendingPayments,
    },
    {
      label: "quote requests older than 24 hours",
      value: staleQuotes,
    },
  ].filter((item) => item.value > 0);
};

export type TodayOperationItem = ReturnType<typeof getTodayOperations>[number];
export type AttentionItem = ReturnType<typeof getNeedsAttention>[number];
