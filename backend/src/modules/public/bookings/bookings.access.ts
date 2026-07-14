import {
  BookingPaymentStatus,
  BookingStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as availabilityRepo from "@/modules/public/availability/availability.repository.js";
import type * as repo from "./bookings.repository.js";
import { getPaidAmount } from "./bookings.financials.js";

export const assertBookingCheckoutEditable = async (
  booking: repo.PublicBookingRecord,
  userId: string | undefined,
  editToken: string | undefined,
  tx: Prisma.TransactionClient,
) => {
  if (
    booking.paymentStatus !== BookingPaymentStatus.PENDING ||
    getPaidAmount(booking) > 0
  ) {
    throw new HttpError(
      409,
      "BOOKING_PAYMENT_STARTED",
      "Booking details cannot be edited after payment starts",
    );
  }

  if (booking.status !== BookingStatus.PENDING) {
    throw new HttpError(
      409,
      "BOOKING_CHECKOUT_LOCKED",
      "Only pending bookings can be edited before payment",
    );
  }

  if (userId !== undefined && userId === booking.userId) {
    return;
  }

  if (editToken !== undefined) {
    const lock = await availabilityRepo.findReleasedInventoryLockByBookingToken(
      booking.id,
      editToken,
      tx,
    );
    if (lock) {
      return;
    }
  }

  throw new HttpError(
    403,
    "BOOKING_EDIT_FORBIDDEN",
    "You cannot edit this booking checkout",
  );
};

export const assertPublicBookingAccess = async (
  booking: repo.PublicBookingRecord,
  userId: string | undefined,
  checkoutToken: string | undefined,
) => {
  if (userId !== undefined && userId === booking.userId) {
    return;
  }

  if (checkoutToken !== undefined) {
    const lock = await availabilityRepo.findReleasedInventoryLockByBookingToken(
      booking.id,
      checkoutToken,
    );
    if (lock) {
      return;
    }
  }

  throw new HttpError(
    403,
    "BOOKING_ACCESS_FORBIDDEN",
    "You cannot access this booking",
  );
};
