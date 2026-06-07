import { Prisma } from "@/generated/prisma/client.js";
import type { DashboardTaxDTO } from "./taxes.dto.js";

export type DashboardTaxRecord = Prisma.TaxGetPayload<{
  include: {
    property: true;
  };
}>;

export const mapTax = (tax: DashboardTaxRecord): DashboardTaxDTO => ({
  id: tax.id,
  propertyId: tax.propertyId,
  propertyName: tax.property.name,
  name: tax.name,
  rate: tax.rate.toString(),
  taxType: tax.taxType,
  category: tax.category,
  scope: tax.scope,
  targetType: tax.targetType,
  calculationMode: tax.calculationMode,
  discountTreatment: tax.discountTreatment,
  minTariff: tax.minTariff?.toString() ?? null,
  maxTariff: tax.maxTariff?.toString() ?? null,
  validFrom: tax.validFrom ?? null,
  validTo: tax.validTo ?? null,
  priority: tax.priority,
  appliesTo: tax.appliesTo,
  isRefundable: tax.isRefundable,
  isActive: tax.isActive,
  createdAt: tax.createdAt,
  updatedAt: tax.updatedAt,
});
