import {
  BookingStatus,
  UserRole,
  PaymentMethod,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { RecordDashboardBookingPaymentInput } from "./bookings.inputs.js";

export const allowedBookingTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [
    BookingStatus.CHECKED_IN,
    BookingStatus.CANCELLED,
    BookingStatus.NO_SHOW,
  ],
  [BookingStatus.CHECKED_IN]: [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED],
  [BookingStatus.CHECKED_OUT]: [],
  [BookingStatus.CANCELLED]: [],
  [BookingStatus.NO_SHOW]: [],
};

export const getLifecycleReversalTarget = (
  status: BookingStatus,
): BookingStatus | null => {
  if (status === BookingStatus.CHECKED_IN) return BookingStatus.CONFIRMED;
  if (status === BookingStatus.CHECKED_OUT) return BookingStatus.CHECKED_IN;
  if (status === BookingStatus.NO_SHOW) return BookingStatus.CONFIRMED;
  return null;
};

export const getVacatedRoomIds = (
  previousRoomIds: readonly string[],
  nextRoomIds: readonly string[],
) => previousRoomIds.filter((roomId) => !nextRoomIds.includes(roomId));

export const getLocalDateValue = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return getPart("year") * 10_000 + getPart("month") * 100 + getPart("day");
};

export const assertBookingLifecycleDateAllowed = (
  booking: { checkIn: Date; checkOut: Date; property: { tenant: { timezone: string } } },
  nextStatus: BookingStatus,
  now = new Date(),
) => {
  const timeZone = booking.property.tenant.timezone;
  const today = getLocalDateValue(now, timeZone);

  if (
    nextStatus === BookingStatus.CHECKED_IN &&
    today < getLocalDateValue(booking.checkIn, timeZone)
  ) {
    throw new HttpError(
      409,
      "CHECK_IN_TOO_EARLY",
      "Guest can be checked in only on or after the check-in date",
    );
  }

  if (
    nextStatus === BookingStatus.CHECKED_IN &&
    today > getLocalDateValue(booking.checkIn, timeZone)
  ) {
    throw new HttpError(
      409,
      "CHECK_IN_TOO_LATE",
      "Guest cannot be checked in after the check-in date has passed",
    );
  }
};

export const assertBookingTransitionAllowed = (
  fromStatus: BookingStatus,
  toStatus: BookingStatus,
) => {
  if (allowedBookingTransitions[fromStatus].includes(toStatus)) {
    return;
  }

  throw new HttpError(
    409,
    "INVALID_BOOKING_STATUS_TRANSITION",
    `Cannot move booking from ${fromStatus} to ${toStatus}`,
  );
};

export const isAdminOverrideRole = (role: UserRole) =>
  role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;

export const requireAuditNote = (note: string | undefined, message: string) => {
  if (!note?.trim()) {
    throw new HttpError(422, "AUDIT_NOTE_REQUIRED", message);
  }
};

const paymentMethodsRequiringReference = new Set<PaymentMethod>([
  PaymentMethod.UPI_MANUAL,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CARD_POS,
]);

export const assertManualPaymentProof = (
  input: RecordDashboardBookingPaymentInput,
) => {
  if (
    paymentMethodsRequiringReference.has(input.method) &&
    !input.referenceId?.trim()
  ) {
    throw new HttpError(
      422,
      "PAYMENT_REFERENCE_REQUIRED",
      "Reference ID is required for this payment method",
    );
  }
};
