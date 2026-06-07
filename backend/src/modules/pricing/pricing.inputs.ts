import type { PricingTier, RateType } from "@/generated/prisma/enums.js";

export interface DashboardPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardRoomPricingListInput extends DashboardPaginationInput {
  propertyId: string;
  productId?: string;
  rateType?: RateType;
  pricingTier?: PricingTier;
}

export interface CreateDashboardRoomPricingInput {
  productId: string;
  roomId?: string | null;
  unitId?: string | null;
  rateType?: RateType;
  pricingTier?: PricingTier;
  minNights?: number;
  maxNights?: number;
  taxInclusive?: boolean;
  price: number;
  validFrom: Date;
  validTo?: Date;
}

export interface UpdateDashboardRoomPricingInput {
  productId?: string;
  roomId?: string | null;
  unitId?: string | null;
  rateType?: RateType;
  pricingTier?: PricingTier;
  minNights?: number;
  maxNights?: number;
  taxInclusive?: boolean;
  price?: number;
  validFrom?: Date;
  validTo?: Date;
}
