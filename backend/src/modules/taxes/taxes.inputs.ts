import type {
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/enums.js";

export interface TaxPaginationInput {
  page: number;
  limit: number;
}

export interface DashboardTaxListInput extends TaxPaginationInput {
  propertyId: string;
  search?: string;
  taxType?: TaxType;
  category?: TaxCategory;
  scope?: TaxScope;
  isActive?: boolean;
}

export interface CreateDashboardTaxInput {
  name: string;
  rate: number;
  taxType?: TaxType;
  category?: TaxCategory;
  scope?: TaxScope;
  targetType?: TaxTargetType;
  calculationMode?: TaxCalculationMode;
  discountTreatment?: TaxDiscountTreatment;
  minTariff?: number | null;
  maxTariff?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  priority?: number;
  appliesTo?: string;
  isRefundable?: boolean;
  isActive?: boolean;
}

export interface UpdateDashboardTaxInput {
  name?: string;
  rate?: number;
  taxType?: TaxType;
  category?: TaxCategory;
  scope?: TaxScope;
  targetType?: TaxTargetType;
  calculationMode?: TaxCalculationMode;
  discountTreatment?: TaxDiscountTreatment;
  minTariff?: number | null;
  maxTariff?: number | null;
  validFrom?: Date | null;
  validTo?: Date | null;
  priority?: number;
  appliesTo?: string;
  isRefundable?: boolean;
  isActive?: boolean;
}
