import type {
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/enums.js";

export interface DashboardTaxDTO {
  id: string;
  propertyId: string;
  propertyName: string;
  name: string;
  rate: string;
  taxType: TaxType;
  category: TaxCategory;
  scope: TaxScope;
  targetType: TaxTargetType;
  calculationMode: TaxCalculationMode;
  discountTreatment: TaxDiscountTreatment;
  minTariff: string | null;
  maxTariff: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  priority: number;
  appliesTo: string;
  isRefundable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
