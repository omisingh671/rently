import type { Prisma } from "@/generated/prisma/client.js";
import { normalizeCouponCode } from "./bookings.coupons.js";
import { getNights } from "./bookings.lifecycle.js";
import { buildQuoteItemsFromBooking } from "./bookings.mapping.js";
import { getBookingPolicyDto } from "./bookings.policy.js";
import { calculateQuoteTotals } from "./bookings.pricing.js";
import * as repo from "./bookings.repository.js";

export const calculateExistingBookingCheckoutQuote = async (
  booking: repo.PublicBookingRecord,
  couponCode: string | null | undefined,
  tx: Prisma.TransactionClient,
) => {
  const propertyCurrency = await repo.findPropertyCurrencyById(
    booking.propertyId,
    tx,
  );
  const policy = await getBookingPolicyDto(booking, tx);

  return calculateQuoteTotals(
    {
      propertyId: booking.propertyId,
      bookingType: booking.bookingType,
      checkIn: booking.checkIn,
      nights: getNights(booking.checkIn, booking.checkOut),
      guestCount: booking.guestCount,
      comfortOption: booking.comfortOption,
      paymentPolicy: booking.paymentPolicy,
      upfrontAmount: Number(booking.upfrontAmount),
      currency: propertyCurrency?.tenant.defaultCurrency ?? "INR",
      policy,
      couponCode: normalizeCouponCode(couponCode),
      items: buildQuoteItemsFromBooking(booking),
      userId: booking.userId,
      currentCouponId: booking.couponId ?? undefined,
      excludeBookingId: booking.id,
    },
    tx,
  );
};
