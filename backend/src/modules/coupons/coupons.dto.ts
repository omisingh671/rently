import type { DiscountType } from "@/generated/prisma/enums.js";

export interface DashboardCouponDTO {
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
  validFrom: Date;
  validTo: Date | null;
  isActive: boolean;
  oncePerUser: boolean;
  createdAt: Date;
  updatedAt: Date;
}
