import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./bookings.repository.js";

const now = () => new Date();
const money = (value: number) => Math.round(value * 100) / 100;

export const normalizeCouponCode = (couponCode: string | null | undefined) => {
  const trimmed = couponCode?.trim();
  return trimmed ? trimmed.toUpperCase() : undefined;
};

export const validateAndApplyCoupon = async (
  propertyId: string,
  code: string | undefined,
  nights: number,
  totalBeforeDiscount: number,
  tx: Prisma.TransactionClient,
  options: {
    userId?: string | undefined;
    currentCouponId?: string | undefined;
    excludeBookingId?: string | undefined;
  } = {},
) => {
  if (!code) return { couponId: undefined, discountAmount: 0 };

  const coupon = await repo.findActiveCouponByCode(propertyId, code, now(), tx);

  if (!coupon) {
    throw new HttpError(422, "INVALID_COUPON", "Invalid or expired coupon code");
  }

  if (
    coupon.id !== options.currentCouponId &&
    coupon.maxUses !== null &&
    coupon.usedCount >= coupon.maxUses
  ) {
    throw new HttpError(422, "COUPON_EXHAUSTED", "Coupon usage limit reached");
  }

  if (coupon.oncePerUser && options.userId) {
    const previousBookingCount = await repo.countUserCouponBookings(
      options.userId,
      coupon.id,
      options.excludeBookingId,
      tx,
    );
    if (previousBookingCount > 0) {
      throw new HttpError(
        422,
        "COUPON_ALREADY_USED",
        "Coupon has already been used by this user",
      );
    }
  }

  if (coupon.minNights !== null && nights < coupon.minNights) {
    throw new HttpError(
      422,
      "COUPON_MIN_NIGHTS",
      `Coupon requires a minimum of ${coupon.minNights} nights`,
    );
  }

  if (
    coupon.minAmount !== null &&
    totalBeforeDiscount < Number(coupon.minAmount)
  ) {
    throw new HttpError(
      422,
      "COUPON_MIN_AMOUNT",
      `Coupon requires a minimum booking amount of ${Number(coupon.minAmount)}`,
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === "PERCENTAGE") {
    discountAmount = (totalBeforeDiscount * Number(coupon.discountValue)) / 100;
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  discountAmount = Math.min(discountAmount, totalBeforeDiscount);

  return {
    couponId: coupon.id,
    discountAmount: money(discountAmount),
  };
};
