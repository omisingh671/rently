import type { PaginatedResult } from "@/common/types/pagination.js";
import {
  BookingPaymentStatus,
  BookingStatus,
  PaymentStatus,
  PropertyAssignmentRole,
  Prisma,
} from "@/generated/prisma/client.js";
import type {
  DashboardAmenityDTO,
  DashboardBookingDTO,
  DashboardCouponDTO,
  DashboardEnquiryDTO,
  DashboardMaintenanceBlockDTO,
  DashboardPropertyAssignmentDTO,
  DashboardPropertyDTO,
  DashboardQuoteDTO,
  DashboardRoomDTO,
  DashboardRoomPricingDTO,
  DashboardRoomProductDTO,
  DashboardTaxDTO,
  DashboardTenantDTO,
  DashboardUnitDTO,
  DashboardUserDTO,
} from "./dashboard.dto.js";
import type * as repo from "./dashboard.repository.js";

export const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

export const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
): PaginatedResult<T> => ({
  items,
  pagination: buildPagination(page, limit, total),
});

export const mapUser = (
  user: repo.DashboardUserRecord,
): DashboardUserDTO => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  createdByUserId: user.createdByUserId ?? null,
  countryCode: user.countryCode ?? null,
  contactNumber: user.contactNumber ?? null,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const mapProperty = (
  property: repo.DashboardPropertyRecord,
): DashboardPropertyDTO => {
  const adminAssignment = property.assignments.find(
    (assignment) => assignment.role === PropertyAssignmentRole.ADMIN,
  );

  return {
    id: property.id,
    tenantId: property.tenantId,
    tenantName: property.tenant.name,
    name: property.name,
    address: property.address,
    city: property.city,
    state: property.state,
    status: property.status,
    isActive: property.isActive,
    createdByUserId: property.createdByUserId,
    createdAt: property.createdAt,
    updatedAt: property.updatedAt,
    adminAssignment: adminAssignment
      ? {
          userId: adminAssignment.user.id,
          fullName: adminAssignment.user.fullName,
          email: adminAssignment.user.email,
        }
      : null,
  };
};

export const mapTenant = (
  tenant: repo.DashboardTenantRecord,
): DashboardTenantDTO => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  primaryDomain: tenant.primaryDomain ?? null,
  status: tenant.status,
  brandName: tenant.brandName,
  logoUrl: tenant.logoUrl ?? null,
  primaryColor: tenant.primaryColor,
  secondaryColor: tenant.secondaryColor,
  supportEmail: tenant.supportEmail ?? null,
  supportPhone: tenant.supportPhone ?? null,
  defaultCurrency: tenant.defaultCurrency,
  timezone: tenant.timezone,
  payAtCheckInEnabled: tenant.payAtCheckInEnabled,
  bookingTokenAmount: tenant.bookingTokenAmount.toString(),
  createdAt: tenant.createdAt,
  updatedAt: tenant.updatedAt,
});

export const mapAssignment = (
  assignment: repo.DashboardPropertyAssignmentRecord,
): DashboardPropertyAssignmentDTO => ({
  id: assignment.id,
  propertyId: assignment.propertyId,
  propertyName: assignment.property.name,
  userId: assignment.userId,
  userName: assignment.user.fullName,
  userEmail: assignment.user.email,
  role: assignment.role,
  assignedByUserId: assignment.assignedByUserId,
  assignedByName: assignment.assignedBy.fullName,
  createdAt: assignment.createdAt,
});

export const mapAmenity = (
  amenity: repo.DashboardAmenityRecord,
): DashboardAmenityDTO => ({
  id: amenity.id,
  propertyId: amenity.propertyId,
  propertyName: amenity.property.name,
  name: amenity.name,
  icon: amenity.icon ?? null,
  isActive: amenity.isActive,
  createdAt: amenity.createdAt,
});

export const mapUnit = (unit: repo.DashboardUnitRecord): DashboardUnitDTO => ({
  id: unit.id,
  propertyId: unit.propertyId,
  propertyName: unit.property.name,
  unitNumber: unit.unitNumber,
  floor: unit.floor,
  status: unit.status,
  isActive: unit.isActive,
  amenityIds: unit.amenities.map((amenityLink) => amenityLink.amenityId),
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
});

export const mapRoom = (room: repo.DashboardRoomRecord): DashboardRoomDTO => ({
  id: room.id,
  propertyId: room.unit.propertyId,
  propertyName: room.unit.property.name,
  unitId: room.unitId,
  unitNumber: room.unit.unitNumber,
  name: room.name,
  number: room.number,
  rent: room.rent,
  hasAC: room.hasAC,
  maxOccupancy: room.maxOccupancy,
  status: room.status,
  isActive: room.isActive,
  unitStatus: room.unit.status,
  unitIsActive: room.unit.isActive,
  amenityIds: room.amenities.map((amenityLink) => amenityLink.amenityId),
  createdAt: room.createdAt,
  updatedAt: room.updatedAt,
});

export const mapMaintenanceBlock = (
  block: repo.DashboardMaintenanceRecord,
): DashboardMaintenanceBlockDTO => ({
  id: block.id,
  propertyId: block.propertyId,
  propertyName: block.property.name,
  targetType: block.targetType,
  unitId: block.unitId ?? block.room?.unitId ?? null,
  unitNumber: block.unit?.unitNumber ?? block.room?.unit.unitNumber ?? null,
  roomId: block.roomId ?? null,
  roomLabel: block.room
    ? `${block.room.number} (${block.room.name})`
    : null,
  reason: block.reason ?? null,
  startDate: block.startDate,
  endDate: block.endDate,
  createdByUserId: block.createdByUserId,
  createdByName: block.createdBy.fullName,
  createdAt: block.createdAt,
  updatedAt: block.updatedAt,
});

export const mapRoomProduct = (
  product: repo.DashboardRoomProductRecord,
): DashboardRoomProductDTO => ({
  id: product.id,
  propertyId: product.propertyId,
  propertyName: product.property.name,
  name: product.name,
  occupancy: product.occupancy,
  hasAC: product.hasAC,
  category: product.category,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export const mapRoomPricing = (
  pricing: repo.DashboardRoomPricingRecord,
): DashboardRoomPricingDTO => ({
  id: pricing.id,
  propertyId: pricing.propertyId,
  propertyName: pricing.property.name,
  roomId: pricing.roomId ?? null,
  roomLabel: pricing.room
    ? `${pricing.room.number} (${pricing.room.name})`
    : null,
  unitId: pricing.unitId ?? pricing.room?.unitId ?? null,
  unitNumber: pricing.unit?.unitNumber ?? pricing.room?.unit.unitNumber ?? null,
  productId: pricing.productId,
  productName: pricing.product.name,
  rateType: pricing.rateType,
  pricingTier: pricing.pricingTier,
  minNights: pricing.minNights,
  maxNights: pricing.maxNights ?? null,
  taxInclusive: pricing.taxInclusive,
  price: pricing.price.toString(),
  validFrom: pricing.validFrom,
  validTo: pricing.validTo ?? null,
  createdAt: pricing.createdAt,
});

export const mapTax = (tax: repo.DashboardTaxRecord): DashboardTaxDTO => ({
  id: tax.id,
  propertyId: tax.propertyId,
  propertyName: tax.property.name,
  name: tax.name,
  rate: tax.rate.toString(),
  taxType: tax.taxType,
  appliesTo: tax.appliesTo,
  isActive: tax.isActive,
  createdAt: tax.createdAt,
  updatedAt: tax.updatedAt,
});

export const mapCoupon = (
  coupon: repo.DashboardCouponRecord,
): DashboardCouponDTO => ({
  id: coupon.id,
  propertyId: coupon.propertyId,
  propertyName: coupon.property.name,
  code: coupon.code,
  name: coupon.name,
  discountType: coupon.discountType,
  discountValue: coupon.discountValue.toString(),
  maxUses: coupon.maxUses ?? null,
  usedCount: coupon.usedCount,
  minNights: coupon.minNights ?? null,
  minAmount: coupon.minAmount?.toString() ?? null,
  validFrom: coupon.validFrom,
  validTo: coupon.validTo ?? null,
  isActive: coupon.isActive,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});

const zeroDecimal = new Prisma.Decimal(0);

const maxDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.greaterThan(right) ? left : right;

const getBookingPaidAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0),
    );

const getBookingPaymentStatus = (
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
) => {
  if (paidAmount.lessThanOrEqualTo(0)) {
    return BookingPaymentStatus.PENDING;
  }

  if (paidAmount.lessThan(totalAmount)) {
    return BookingPaymentStatus.PARTIALLY_PAID;
  }

  return BookingPaymentStatus.PAID;
};

const getDateParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
};

const compareLocalDate = (
  left: ReturnType<typeof getDateParts>,
  right: ReturnType<typeof getDateParts>,
) => {
  const leftValue = left.year * 10_000 + left.month * 100 + left.day;
  const rightValue = right.year * 10_000 + right.month * 100 + right.day;
  return leftValue - rightValue;
};

export const isBookingNoShowEligible = (
  booking: repo.DashboardBookingRecord,
  now = new Date(),
) => {
  if (booking.status !== BookingStatus.CONFIRMED) {
    return false;
  }

  const timeZone = booking.property.tenant.timezone;
  const currentLocal = getDateParts(now, timeZone);
  const checkInLocal = getDateParts(booking.checkIn, timeZone);
  const dateCompare = compareLocalDate(currentLocal, checkInLocal);

  if (dateCompare > 0) {
    return true;
  }

  return dateCompare === 0 && (currentLocal.hour > 20 ||
    (currentLocal.hour === 20 && currentLocal.minute >= 0));
};

export const mapBooking = (
  booking: repo.DashboardBookingRecord,
): DashboardBookingDTO => {
  const paidAmount = getBookingPaidAmount(booking);
  const balanceAmount = maxDecimal(
    zeroDecimal,
    booking.totalAmount.minus(paidAmount),
  );

  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    propertyId: booking.propertyId,
    propertyName: booking.property.name,
    userId: booking.userId,
    guestName: booking.guestNameSnapshot,
    guestEmail: booking.guestEmailSnapshot,
    guestNameSnapshot: booking.guestNameSnapshot,
    guestEmailSnapshot: booking.guestEmailSnapshot,
    guestContactSnapshot: booking.guestContactSnapshot ?? null,
    bookingType: booking.bookingType,
    guestCount: booking.guestCount,
    comfortOption: booking.comfortOption,
    productId: booking.productId ?? null,
    targetType: booking.targetType,
    unitId: booking.unitId ?? null,
    roomId: booking.roomId ?? null,
    targetLabel: booking.targetLabel,
    productName: booking.productName,
    pricePerNight: booking.pricePerNight.toString(),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    totalAmount: booking.totalAmount.toString(),
    paymentStatus: getBookingPaymentStatus(booking.totalAmount, paidAmount),
    paidAmount: paidAmount.toString(),
    balanceAmount: balanceAmount.toString(),
    paymentPolicy: booking.paymentPolicy,
    upfrontAmount: booking.upfrontAmount.toString(),
    noShowEligible: isBookingNoShowEligible(booking),
    internalNotes: booking.internalNotes ?? null,
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      purpose: payment.purpose,
      method: payment.method,
      amount: payment.amount.toString(),
      currency: payment.currency,
      note: payment.note ?? null,
      receivedByUserId: payment.receivedByUserId ?? null,
      paidAt: payment.paidAt ?? null,
      createdAt: payment.createdAt,
    })),
    items: booking.items.map((item) => ({
      id: item.id,
      targetType: item.targetType,
      unitId: item.unitId ?? null,
      roomId: item.roomId ?? null,
      productId: item.productId ?? null,
      targetLabel: item.targetLabel,
      productName: item.productName,
      capacity: item.capacity,
      guestCount: item.guestCount,
      comfortOption: item.comfortOption,
      pricePerNight: item.pricePerNight.toString(),
      totalAmount: item.totalAmount.toString(),
    })),
    statusHistory: booking.statusHistory.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus ?? null,
      toStatus: event.toStatus,
      actorUserId: event.actorUserId ?? null,
      actorName: event.actor?.fullName ?? null,
      note: event.note ?? null,
      createdAt: event.createdAt,
    })),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};

export const mapEnquiry = (
  enquiry: repo.DashboardEnquiryRecord,
): DashboardEnquiryDTO => ({
  id: enquiry.id,
  propertyId: enquiry.propertyId,
  propertyName: enquiry.property.name,
  name: enquiry.name,
  email: enquiry.email,
  contactNumber: enquiry.contactNumber,
  message: enquiry.message,
  source: enquiry.source ?? null,
  status: enquiry.status,
  createdAt: enquiry.createdAt,
  updatedAt: enquiry.updatedAt,
});

export const mapQuote = (
  quote: repo.DashboardQuoteRecord,
): DashboardQuoteDTO => ({
  id: quote.id,
  propertyId: quote.propertyId,
  propertyName: quote.property.name,
  userId: quote.userId ?? null,
  guestName: quote.user?.fullName ?? null,
  guestEmail: quote.user?.email ?? null,
  productId: quote.productId ?? null,
  productName: quote.product?.name ?? null,
  targetType: quote.targetType,
  unitId: quote.unitId ?? null,
  roomId: quote.roomId ?? null,
  checkIn: quote.checkIn,
  checkOut: quote.checkOut,
  status: quote.status,
  notes: quote.notes ?? null,
  createdAt: quote.createdAt,
  updatedAt: quote.updatedAt,
});
