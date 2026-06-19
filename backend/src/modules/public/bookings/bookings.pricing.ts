import {
  BookingPaymentPolicy,
  BookingTargetType,
  BookingType,
  ComfortOption,
  Prisma,
  TaxCalculationMode,
  TaxCategory,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/client.js";
import type { Tax } from "@/generated/prisma/client.js";
import { calculatePolicyAdvanceAmount } from "@/modules/booking-policy/booking-policy.policy.js";
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";
import type {
  PublicBookingQuoteDTO,
  PublicBookingQuoteItemDTO,
  PublicTaxBreakdownDTO,
} from "./bookings.dto.js";
import { validateAndApplyCoupon } from "./bookings.coupons.js";
import * as repo from "./bookings.repository.js";

export interface QuoteCalculationInput {
  propertyId: string;
  bookingType: BookingType;
  checkIn: Date;
  nights: number;
  guestCount: number;
  comfortOption: ComfortOption;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  currency: string;
  policy: PublicBookingPolicyDTO;
  couponCode: string | undefined;
  items: PublicBookingQuoteItemDTO[];
  userId?: string | undefined;
  currentCouponId?: string | undefined;
  excludeBookingId?: string | undefined;
}

export interface QuoteCalculationResult extends PublicBookingQuoteDTO {
  couponId: string | undefined;
}

const money = (value: number) => Math.round(value * 100) / 100;

const taxNameLooksLikeGst = (tax: Tax) =>
  /\b(?:gst|cgst|sgst|igst)\b/i.test(tax.name);

const getLegacyTaxTargets = (tax: Tax) =>
  new Set(["ALL", "BOOKING", "STAY", tax.appliesTo.trim().toUpperCase()]);

const taxMatchesTarget = (tax: Tax, targetType: BookingTargetType) => {
  if (
    tax.targetType === TaxTargetType.ALL ||
    String(tax.targetType) === String(targetType)
  ) {
    return true;
  }

  return getLegacyTaxTargets(tax).has(targetType);
};

const taxIsValidForStay = (tax: Tax, checkIn: Date) =>
  (tax.validFrom === null || tax.validFrom <= checkIn) &&
  (tax.validTo === null || tax.validTo >= checkIn);

const isAccommodationGstSlab = (tax: Tax) =>
  tax.category === TaxCategory.GST &&
  tax.scope === TaxScope.ACCOMMODATION &&
  tax.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF;

const tariffMatchesTaxSlab = (tariff: number, tax: Tax) => {
  const minTariff = tax.minTariff === null ? 0 : Number(tax.minTariff);
  const maxTariff = tax.maxTariff === null ? null : Number(tax.maxTariff);

  return tariff >= minTariff && (maxTariff === null || tariff < maxTariff);
};

const getApplicableTaxes = (
  taxes: Tax[],
  item: PublicBookingQuoteItemDTO,
  checkIn: Date,
) => {
  const targetTaxes = taxes.filter(
    (tax) =>
      taxIsValidForStay(tax, checkIn) && taxMatchesTarget(tax, item.targetType),
  );
  const gstSlabs = targetTaxes
    .filter(isAccommodationGstSlab)
    .filter((tax) => tariffMatchesTaxSlab(item.pricePerNight, tax))
    .sort((left, right) => {
      const priorityDiff = right.priority - left.priority;
      if (priorityDiff !== 0) return priorityDiff;

      const leftMin = left.minTariff === null ? 0 : Number(left.minTariff);
      const rightMin = right.minTariff === null ? 0 : Number(right.minTariff);
      return rightMin - leftMin;
    });
  const selectedGstSlab = gstSlabs[0];
  const genericTaxes = targetTaxes.filter(
    (tax) =>
      tax.category === TaxCategory.GENERIC &&
      tax.calculationMode === TaxCalculationMode.FLAT,
  );

  if (!selectedGstSlab) {
    return genericTaxes;
  }

  return [
    selectedGstSlab,
    ...genericTaxes.filter((tax) => !taxNameLooksLikeGst(tax)),
  ];
};

const calculateLineTax = (
  taxableAmount: number,
  tax: Tax,
  included: boolean,
) => {
  const rate = Number(tax.rate);
  if (tax.taxType === TaxType.PERCENTAGE) {
    return included
      ? money((taxableAmount * rate) / (100 + rate))
      : money((taxableAmount * rate) / 100);
  }

  return money(Math.min(rate, taxableAmount));
};

export const calculateQuoteTotals = async (
  input: QuoteCalculationInput,
  tx: Prisma.TransactionClient,
): Promise<QuoteCalculationResult> => {
  const subtotalAmount = money(
    input.items.reduce((total, item) => total + item.totalAmount, 0),
  );
  const { couponId, discountAmount } = await validateAndApplyCoupon(
    input.propertyId,
    input.couponCode,
    input.nights,
    subtotalAmount,
    tx,
    {
      userId: input.userId,
      currentCouponId: input.currentCouponId,
      excludeBookingId: input.excludeBookingId,
    },
  );
  const discountedSubtotal = money(subtotalAmount - discountAmount);
  const taxes = await repo.listActiveTaxes(input.propertyId, tx);
  const exclusiveBreakdown = new Map<string, PublicTaxBreakdownDTO>();
  const inclusiveBreakdown = new Map<string, PublicTaxBreakdownDTO>();
  const calculatedItems: PublicBookingQuoteItemDTO[] = [];
  let allocatedDiscountAmount = 0;

  for (const [index, item] of input.items.entries()) {
    const itemRatio = subtotalAmount > 0 ? item.totalAmount / subtotalAmount : 0;
    const lineDiscountAmount =
      index === input.items.length - 1
        ? money(discountAmount - allocatedDiscountAmount)
        : money(discountAmount * itemRatio);
    allocatedDiscountAmount = money(allocatedDiscountAmount + lineDiscountAmount);
    const lineSubtotalAmount = money(item.totalAmount);
    const lineTaxableAmount = money(lineSubtotalAmount - lineDiscountAmount);
    const itemTaxes = getApplicableTaxes(taxes, item, input.checkIn);
    const itemBreakdown: PublicTaxBreakdownDTO[] = [];
    let lineTaxAmount = 0;
    let lineExclusiveTaxAmount = 0;

    for (const tax of itemTaxes) {
      const taxAmount = calculateLineTax(
        lineTaxableAmount,
        tax,
        item.taxInclusive,
      );
      const key = `${tax.id}:${item.taxInclusive ? "included" : "exclusive"}`;
      const targetMap = item.taxInclusive ? inclusiveBreakdown : exclusiveBreakdown;
      const existing = targetMap.get(key);
      const next: PublicTaxBreakdownDTO = {
        taxId: tax.id,
        name: tax.name,
        taxType: tax.taxType,
        rate: Number(tax.rate),
        appliesTo: tax.targetType,
        taxableAmount: money((existing?.taxableAmount ?? 0) + lineTaxableAmount),
        taxAmount: money((existing?.taxAmount ?? 0) + taxAmount),
        included: item.taxInclusive,
        isRefundable:
          (tax as unknown as { isRefundable?: boolean }).isRefundable ?? true,
      };

      targetMap.set(key, next);
      itemBreakdown.push({
        ...next,
        taxableAmount: lineTaxableAmount,
        taxAmount,
      });
      lineTaxAmount = money(lineTaxAmount + taxAmount);
      if (!item.taxInclusive) {
        lineExclusiveTaxAmount = money(lineExclusiveTaxAmount + taxAmount);
      }
    }

    calculatedItems.push({
      ...item,
      subtotalAmount: lineSubtotalAmount,
      discountAmount: lineDiscountAmount,
      taxableAmount: lineTaxableAmount,
      taxAmount: lineTaxAmount,
      taxBreakdown: itemBreakdown,
      totalAmount: lineSubtotalAmount,
      finalAmount: money(lineTaxableAmount + lineExclusiveTaxAmount),
    });
  }

  const taxBreakdown = [
    ...inclusiveBreakdown.values(),
    ...exclusiveBreakdown.values(),
  ];
  const taxAmount = money(
    taxBreakdown.reduce((total, tax) => total + tax.taxAmount, 0),
  );
  const exclusiveTaxAmount = money(
    [...exclusiveBreakdown.values()].reduce(
      (total, tax) => total + tax.taxAmount,
      0,
    ),
  );
  const totalAmount = money(discountedSubtotal + exclusiveTaxAmount);
  const upfrontAmount =
    input.paymentPolicy === BookingPaymentPolicy.NO_UPFRONT_PAYMENT
      ? 0
      : money(Number(calculatePolicyAdvanceAmount(input.policy, totalAmount)));

  return {
    propertyId: input.propertyId,
    bookingType: input.bookingType,
    nights: input.nights,
    guestCount: input.guestCount,
    comfortOption: input.comfortOption,
    currency: input.currency,
    subtotalAmount,
    discountAmount,
    taxableAmount: discountedSubtotal,
    taxAmount,
    totalAmount,
    paymentPolicy: input.paymentPolicy,
    upfrontAmount,
    remainingPayAtCheckIn: money(Math.max(0, totalAmount - upfrontAmount)),
    policy: input.policy,
    couponCode: input.couponCode?.trim().toUpperCase() ?? null,
    taxBreakdown,
    items: calculatedItems,
    couponId,
  };
};
