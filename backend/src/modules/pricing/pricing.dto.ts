import type { PricingTier, RateType } from "@/generated/prisma/enums.js";

export interface DashboardRoomPricingDTO {
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
  validFrom: Date;
  validTo: Date | null;
  createdAt: Date;
}
