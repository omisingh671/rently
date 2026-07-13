import { Prisma } from "@/generated/prisma/client.js";
import type * as repo from "./billing.repository.js";

const zeroDecimal = new Prisma.Decimal(0);

export const buildGuestSnapshot = (booking: repo.BillingBookingRecord) => ({
  name: booking.guestNameSnapshot,
  email: booking.guestEmailSnapshot,
  contactNumber: booking.guestContactSnapshot ?? null,
  userId: booking.userId,
});

export const buildPropertySnapshot = (booking: repo.BillingBookingRecord) => ({
  id: booking.propertyId,
  name: booking.property.name,
  address: booking.property.address,
  city: booking.property.city,
  state: booking.property.state,
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
  ...booking.folioCharges.map((charge) => ({
    id: charge.id,
    description: charge.description,
    targetLabel: booking.targetLabel,
    quantity: 1,
    rate: charge.amount.toString(),
    discount: "0",
    taxable: charge.amount.toString(),
    tax: "0",
    total: charge.amount.toString(),
    taxBreakdown: charge.metadata,
  })),
];

export const getFolioTotal = (booking: repo.BillingBookingRecord) =>
  booking.folioCharges.reduce(
    (total, charge) => total.plus(charge.amount),
    zeroDecimal,
  );

export const buildPriceSnapshot = (booking: repo.BillingBookingRecord) => ({
  pricePerNight: booking.pricePerNight.toString(),
  subtotalAmount: booking.subtotalAmount.toString(),
  discountAmount: booking.discountAmount.toString(),
  taxableAmount: booking.taxableAmount.toString(),
  taxAmount: booking.taxAmount.toString(),
  totalAmount: booking.totalAmount.toString(),
  folioTotal: getFolioTotal(booking).toString(),
  grandTotal: booking.totalAmount.plus(getFolioTotal(booking)).toString(),
  upfrontAmount: booking.upfrontAmount.toString(),
});

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
