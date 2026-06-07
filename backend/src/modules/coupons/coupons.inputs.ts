import type { DiscountType } from "@/generated/prisma/enums.js";

export interface CouponPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardCouponListInput extends CouponPaginationInput {
  propertyId: string;
  search?: string;
  discountType?: DiscountType;
  isActive?: boolean;
}

export interface CreateDashboardCouponInput {
  code: string;
  name: string;
  discountType?: DiscountType;
  discountValue: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom: Date;
  validTo?: Date;
  isActive?: boolean;
  oncePerUser?: boolean;
}

export interface UpdateDashboardCouponInput {
  code?: string;
  name?: string;
  discountType?: DiscountType;
  discountValue?: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom?: Date;
  validTo?: Date;
  isActive?: boolean;
  oncePerUser?: boolean;
}
