import type { PaginatedResult } from "@/common/types/pagination";

export type RoomProductCategory = "NIGHTLY" | "LONG_STAY" | "CORPORATE";
export type RateType = "NIGHTLY" | "WEEKLY" | "MONTHLY";
export type PricingTier = "STANDARD" | "CORPORATE" | "SEASONAL";
export type DiscountType = "PERCENTAGE" | "FIXED";
export type TaxType = "PERCENTAGE" | "FIXED";

export type AdminRoomProduct = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
  createdAt: string;
  updatedAt: string;
};

export type AdminRoomPricing = {
  id: string;
  propertyId: string;
  propertyName: string;
  roomId: string | null;
  roomLabel: string | null;
  unitId: string | null;
  unitNumber: string | null;
  productId: string;
  productName: string;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights: number | null;
  taxInclusive: boolean;
  price: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
};

export type AdminTax = {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  rate: string;
  taxType: TaxType;
  appliesTo: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCoupon = {
  id: string;
  propertyId: string;
  propertyName: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: string;
  maxUses: number | null;
  usedCount: number;
  minNights: number | null;
  minAmount: string | null;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductPayload = {
  name: string;
  occupancy: number;
  hasAC: boolean;
  category: RoomProductCategory;
};

export type RatePayload = {
  productId: string;
  unitId?: string;
  roomId?: string;
  rateType: RateType;
  pricingTier: PricingTier;
  minNights: number;
  maxNights?: number;
  taxInclusive: boolean;
  price: number;
  validFrom: string;
  validTo?: string;
};

export type TaxPayload = {
  name: string;
  rate: number;
  taxType: TaxType;
  appliesTo: string;
  isActive: boolean;
};

export type CouponPayload = {
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses?: number;
  minNights?: number;
  minAmount?: number;
  validFrom: string;
  validTo?: string;
  isActive: boolean;
};

export type ProductListResponse = PaginatedResult<AdminRoomProduct>;
export type RateListResponse = PaginatedResult<AdminRoomPricing>;
export type TaxListResponse = PaginatedResult<AdminTax>;
export type CouponListResponse = PaginatedResult<AdminCoupon>;
