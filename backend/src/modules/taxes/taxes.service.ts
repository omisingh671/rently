import {
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  assertCanManageInventory,
  ensurePropertyExists,
} from "@/common/services/scoping.service.js";
import * as repo from "./taxes.repository.js";
import { mapTax, type DashboardTaxRecord } from "./taxes.mapper.js";
import { normalizePaginationResult } from "@/common/types/pagination.js";
import type {
  CreateDashboardTaxInput,
  DashboardTaxListInput,
  UpdateDashboardTaxInput,
} from "./taxes.inputs.js";
import type { DashboardTaxDTO } from "./taxes.dto.js";

type TaxRuleCandidate = {
  id?: string;
  propertyId: string;
  name: string;
  rate: number;
  taxType: TaxType;
  category: TaxCategory;
  scope: TaxScope;
  targetType: TaxTargetType;
  calculationMode: TaxCalculationMode;
  discountTreatment: TaxDiscountTreatment;
  minTariff: number | null;
  maxTariff: number | null;
  validFrom: Date | null;
  validTo: Date | null;
  priority: number;
  isActive: boolean;
};

const isAccommodationGstSlab = (tax: TaxRuleCandidate) =>
  tax.category === TaxCategory.GST &&
  tax.scope === TaxScope.ACCOMMODATION &&
  tax.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF;

const taxNameLooksLikeGst = (name: string) =>
  /\b(?:gst|cgst|sgst|igst)\b/i.test(name);

const taxTargetOverlaps = (
  left: TaxTargetType,
  right: TaxTargetType,
) => left === TaxTargetType.ALL || right === TaxTargetType.ALL || left === right;

const dateRangeOverlaps = (
  leftFrom: Date | null,
  leftTo: Date | null,
  rightFrom: Date | null,
  rightTo: Date | null,
) => {
  const leftStart = leftFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
  const leftEnd = leftTo?.getTime() ?? Number.POSITIVE_INFINITY;
  const rightStart = rightFrom?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightEnd = rightTo?.getTime() ?? Number.POSITIVE_INFINITY;

  return leftStart <= rightEnd && rightStart <= leftEnd;
};

const tariffRangeOverlaps = (
  leftMin: number | null,
  leftMax: number | null,
  rightMin: number | null,
  rightMax: number | null,
) => {
  const leftStart = leftMin ?? 0;
  const leftEnd = leftMax ?? Number.POSITIVE_INFINITY;
  const rightStart = rightMin ?? 0;
  const rightEnd = rightMax ?? Number.POSITIVE_INFINITY;

  return leftStart < rightEnd && rightStart < leftEnd;
};

const buildTaxRuleCandidate = (
  propertyId: string,
  input: CreateDashboardTaxInput,
): TaxRuleCandidate => ({
  propertyId,
  name: input.name,
  rate: input.rate,
  taxType: input.taxType ?? TaxType.PERCENTAGE,
  category: input.category ?? TaxCategory.GENERIC,
  scope: input.scope ?? TaxScope.BOOKING,
  targetType: input.targetType ?? TaxTargetType.ALL,
  calculationMode: input.calculationMode ?? TaxCalculationMode.FLAT,
  discountTreatment:
    input.discountTreatment ?? TaxDiscountTreatment.BEFORE_TAX,
  minTariff: input.minTariff ?? null,
  maxTariff: input.maxTariff ?? null,
  validFrom: input.validFrom ?? null,
  validTo: input.validTo ?? null,
  priority: input.priority ?? 0,
  isActive: input.isActive ?? true,
});

const mergeTaxRuleCandidate = (
  existing: DashboardTaxRecord,
  input: UpdateDashboardTaxInput,
): TaxRuleCandidate => ({
  id: existing.id,
  propertyId: existing.propertyId,
  name: input.name ?? existing.name,
  rate: input.rate ?? Number(existing.rate),
  taxType: input.taxType ?? existing.taxType,
  category: input.category ?? existing.category,
  scope: input.scope ?? existing.scope,
  targetType: input.targetType ?? existing.targetType,
  calculationMode: input.calculationMode ?? existing.calculationMode,
  discountTreatment:
    input.discountTreatment ?? existing.discountTreatment,
  minTariff:
    input.minTariff !== undefined
      ? input.minTariff
      : existing.minTariff === null
        ? null
        : Number(existing.minTariff),
  maxTariff:
    input.maxTariff !== undefined
      ? input.maxTariff
      : existing.maxTariff === null
        ? null
        : Number(existing.maxTariff),
  validFrom:
    input.validFrom !== undefined ? input.validFrom : existing.validFrom,
  validTo: input.validTo !== undefined ? input.validTo : existing.validTo,
  priority: input.priority ?? existing.priority,
  isActive: input.isActive ?? existing.isActive,
});

const assertTaxRuleShape = (candidate: TaxRuleCandidate) => {
  if (
    candidate.calculationMode === TaxCalculationMode.FLAT &&
    (candidate.minTariff !== null || candidate.maxTariff !== null)
  ) {
    throw new HttpError(
      422,
      "FLAT_TAX_TARIFF_NOT_ALLOWED",
      "Flat tax rules cannot use min or max tariff",
    );
  }

  if (
    candidate.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
    candidate.minTariff === null
  ) {
    throw new HttpError(
      422,
      "TAX_SLAB_MIN_TARIFF_REQUIRED",
      "Tax slab min tariff is required",
    );
  }

  if (candidate.maxTariff !== null && candidate.maxTariff <= (candidate.minTariff ?? 0)) {
    throw new HttpError(
      422,
      "INVALID_TAX_SLAB",
      "Tax slab max tariff must be greater than min tariff",
    );
  }

  if (
    candidate.validFrom !== null &&
    candidate.validTo !== null &&
    candidate.validTo < candidate.validFrom
  ) {
    throw new HttpError(
      422,
      "INVALID_TAX_VALIDITY",
      "Tax validTo must be on or after validFrom",
    );
  }

  if (!isAccommodationGstSlab(candidate)) return;

  if (candidate.taxType !== TaxType.PERCENTAGE) {
    throw new HttpError(
      422,
      "GST_SLAB_PERCENTAGE_REQUIRED",
      "GST slabs must use percentage tax",
    );
  }
};

const assertNoConflictingTaxRules = async (candidate: TaxRuleCandidate) => {
  assertTaxRuleShape(candidate);

  if (!candidate.isActive) return;

  if (!isAccommodationGstSlab(candidate) && !taxNameLooksLikeGst(candidate.name)) {
    return;
  }

  const activeTaxes = await repo.listActiveTaxesForConflictCheck({
    propertyId: candidate.propertyId,
    ...(candidate.id !== undefined && { excludeTaxId: candidate.id }),
  });

  for (const tax of activeTaxes) {
    const candidateIsGstSlab = isAccommodationGstSlab(candidate);
    const existingIsGstSlab =
      tax.category === TaxCategory.GST &&
      tax.scope === TaxScope.ACCOMMODATION &&
      tax.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF;
    const existingIsLegacyGst =
      tax.category === TaxCategory.GENERIC && taxNameLooksLikeGst(tax.name);

    if (!candidateIsGstSlab && !existingIsGstSlab) continue;
    if (!existingIsGstSlab && !existingIsLegacyGst) continue;
    if (!taxTargetOverlaps(candidate.targetType, tax.targetType)) continue;
    if (
      !dateRangeOverlaps(
        candidate.validFrom,
        candidate.validTo,
        tax.validFrom,
        tax.validTo,
      )
    ) {
      continue;
    }

    if (
      existingIsGstSlab &&
      candidateIsGstSlab &&
      !tariffRangeOverlaps(
        candidate.minTariff,
        candidate.maxTariff,
        tax.minTariff === null ? null : Number(tax.minTariff),
        tax.maxTariff === null ? null : Number(tax.maxTariff),
      )
    ) {
      continue;
    }

    throw new HttpError(
      409,
      "TAX_RULE_CONFLICT",
      `Tax rule conflicts with active rule "${tax.name}"`,
    );
  }
};

const ensureTaxExists = async (taxId: string) => {
  const tax = await repo.findTaxById(taxId);
  if (!tax) {
    throw new HttpError(404, "TAX_NOT_FOUND", "Tax not found");
  }

  return tax;
};

export const listTaxes = async (
  userId: string,
  filters: DashboardTaxListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listTaxesPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapTax),
  );
};

export const createTax = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardTaxInput,
): Promise<DashboardTaxDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  const candidate = buildTaxRuleCandidate(propertyId, input);
  await assertNoConflictingTaxRules(candidate);

  const tax = await repo.createTax({
    property: {
      connect: {
        id: propertyId,
      },
    },
    name: input.name,
    rate: input.rate,
    ...(input.taxType !== undefined && { taxType: input.taxType }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.scope !== undefined && { scope: input.scope }),
    ...(input.targetType !== undefined && { targetType: input.targetType }),
    ...(input.calculationMode !== undefined && {
      calculationMode: input.calculationMode,
    }),
    ...(input.discountTreatment !== undefined && {
      discountTreatment: input.discountTreatment,
    }),
    ...(input.minTariff !== undefined && { minTariff: input.minTariff }),
    ...(input.maxTariff !== undefined && { maxTariff: input.maxTariff }),
    ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
    ...(input.validTo !== undefined && { validTo: input.validTo }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    ...(input.isRefundable !== undefined && { isRefundable: input.isRefundable }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  return mapTax(tax);
};

export const updateTax = async (
  userId: string,
  taxId: string,
  input: UpdateDashboardTaxInput,
): Promise<DashboardTaxDTO> => {
  const actor = await getActor(userId);
  const existingTax = await ensureTaxExists(taxId);
  await assertCanManageInventory(actor, existingTax.propertyId);
  const candidate = mergeTaxRuleCandidate(existingTax, input);
  await assertNoConflictingTaxRules(candidate);

  const tax = await repo.updateTaxById(taxId, {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.rate !== undefined && { rate: input.rate }),
    ...(input.taxType !== undefined && { taxType: input.taxType }),
    ...(input.category !== undefined && { category: input.category }),
    ...(input.scope !== undefined && { scope: input.scope }),
    ...(input.targetType !== undefined && { targetType: input.targetType }),
    ...(input.calculationMode !== undefined && {
      calculationMode: input.calculationMode,
    }),
    ...(input.discountTreatment !== undefined && {
      discountTreatment: input.discountTreatment,
    }),
    ...(input.minTariff !== undefined && { minTariff: input.minTariff }),
    ...(input.maxTariff !== undefined && { maxTariff: input.maxTariff }),
    ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
    ...(input.validTo !== undefined && { validTo: input.validTo }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    ...(input.isRefundable !== undefined && { isRefundable: input.isRefundable }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  });

  return mapTax(tax);
};
