import { Prisma } from "@/generated/prisma/client.js";
import type { DashboardCouponDTO } from "./coupons.dto.js";

export type DashboardCouponRecord = Prisma.CouponGetPayload<{
  include: {
    property: true;
  };
}>;

export const mapCoupon = (
  coupon: DashboardCouponRecord,
): DashboardCouponDTO => ({
  id: coupon.id,
  propertyId: coupon.propertyId,
  propertyName: coupon.property.name,
  code: coupon.code,
  name: coupon.name,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue.toString(),
  maxUses: coupon.maxUses ?? null,
  usedCount: coupon.usedCount,
  minNights: coupon.minNights ?? null,
  minAmount: coupon.minAmount?.toString() ?? null,
  validFrom: coupon.validFrom,
  validTo: coupon.validTo ?? null,
  isActive: coupon.isActive,
  oncePerUser: coupon.oncePerUser,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});
