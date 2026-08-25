import type * as repo from "./billing.repository.js";
import {
  getFolioChargeFinancialBreakdown,
  getFolioFinancialTotals,
} from "./billing.financials.js";

export const buildGuestSnapshot = (booking: repo.BillingBookingRecord) => ({
  name: booking.guestNameSnapshot,
  email: booking.guestEmailSnapshot,
  contactNumber: booking.guestContactSnapshot ?? null,
  userId: booking.userId,
  legalName: booking.recipientLegalName ?? null,
  gstin: booking.recipientGstin ?? null,
  billingAddress: booking.billingAddressSnapshot ?? null,
  placeOfSupplyStateCode: booking.placeOfSupplyStateCode ?? null,
});

export const buildPropertySnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.propertyId,
  name: booking.property.name,
  address: booking.property.address,
  city: booking.property.city,
  state: booking.property.state,
});

export const buildSupplierSnapshot = (setting: repo.BillingSettingRecord) => ({
  legalName: setting.legalName,
  gstin: setting.gstin,
  pan: setting.pan,
  billingAddress: setting.billingAddress,
  invoicePrefix: setting.invoicePrefix,
  receiptPrefix: setting.receiptPrefix,
  creditNotePrefix: setting.creditNotePrefix,
  debitNotePrefix: setting.debitNotePrefix,
  footerNotes: setting.footerNotes,
  stateCode: setting.stateCode,
  sacCode: setting.sacCode,
});

export const buildTenantSnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.property.tenant.id,
  name: booking.property.tenant.name,
  slug: booking.property.tenant.slug,
  brandName: booking.property.tenant.brandName,
  defaultCurrency: booking.property.tenant.defaultCurrency,
  supportEmail: booking.property.tenant.supportEmail ?? null,
  supportPhone: booking.property.tenant.supportPhone ?? null,
});

export const buildBookingSnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.id,
  bookingRef: booking.bookingRef,
  status: booking.status,
  bookingType: booking.bookingType,
  targetLabel: booking.targetLabel,
  productName: booking.productName,
  guestCount: booking.guestCount,
  comfortOption: booking.comfortOption,
  checkIn: booking.checkIn.toISOString(),
  checkOut: booking.checkOut.toISOString(),
  couponCode: booking.coupon?.code ?? null,
});

export const buildLineItems = (booking: repo.BillingBookingRecord) => [
  ...booking.items.map((item) => ({
    id: item.id,
    description: item.productName,
    targetLabel: item.targetLabel,
    quantity: 1,
    rate: item.subtotalAmount.toString(),
    discount: item.discountAmount.toString(),
    taxable: item.taxableAmount.toString(),
    tax: item.taxAmount.toString(),
    total: item.finalAmount.toString(),
    taxBreakdown: item.taxBreakdown,
  })),
  ...booking.folioCharges.map((charge) => {
    const breakdown = getFolioChargeFinancialBreakdown(charge);
    return {
      id: charge.id,
      description: charge.description,
      targetLabel: booking.targetLabel,
      quantity: 1,
      rate: breakdown.baseAmount.toString(),
      discount: "0",
      taxable: breakdown.baseAmount.toString(),
      tax: breakdown.taxAmount.toString(),
      total: breakdown.totalAmount.toString(),
      taxBreakdown: breakdown.taxBreakdown,
    };
  }),
];

export const getFolioTotal = (booking: repo.BillingBookingRecord) =>
  getFolioFinancialTotals(booking.folioCharges).totalAmount;

export const getFolioTotals = (booking: repo.BillingBookingRecord) =>
  getFolioFinancialTotals(booking.folioCharges);

export const buildTaxSnapshot = (booking: repo.BillingBookingRecord) => [
  ...(Array.isArray(booking.taxBreakdown) ? booking.taxBreakdown : []),
  ...booking.folioCharges.flatMap(
    (charge) => getFolioChargeFinancialBreakdown(charge).taxBreakdown,
  ),
];

export const buildPriceSnapshot = (booking: repo.BillingBookingRecord) => {
  const folio = getFolioTotals(booking);
  return {
    pricePerNight: booking.pricePerNight.toString(),
    subtotalAmount: booking.subtotalAmount.toString(),
    discountAmount: booking.discountAmount.toString(),
    taxableAmount: booking.taxableAmount.toString(),
    taxAmount: booking.taxAmount.toString(),
    totalAmount: booking.totalAmount.toString(),
    folioBaseAmount: folio.baseAmount.toString(),
    folioTaxAmount: folio.taxAmount.toString(),
    folioTotal: folio.totalAmount.toString(),
    grandTotal: booking.totalAmount.plus(folio.totalAmount).toString(),
    upfrontAmount: booking.upfrontAmount.toString(),
  };
};

export const buildPaymentSnapshot = (payment: repo.BillingPaymentRecord) => ({
  id: payment.id,
  provider: payment.provider,
  status: payment.status,
  purpose: payment.purpose,
  method: payment.method,
  amount: payment.amount.toString(),
  currency: payment.currency,
  paidAt: payment.paidAt?.toISOString() ?? null,
  createdAt: payment.createdAt.toISOString(),
  receivedByUserId: payment.receivedByUserId ?? null,
});
