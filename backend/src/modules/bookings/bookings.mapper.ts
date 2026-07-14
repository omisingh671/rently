import {
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingStatus,
  PaymentPurpose,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import { parsePolicySnapshot } from "@/modules/booking-policy/booking-policy.policy.js";
import type { DashboardBookingDTO } from "./bookings.dto.js";
import type * as repo from "./bookings.repository.js";

const zeroDecimal = new Prisma.Decimal(0);

type DashboardTaxBreakdown = DashboardBookingDTO["taxBreakdown"];

const isDashboardTaxBreakdown = (
  value: unknown,
): value is DashboardTaxBreakdown =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "taxId" in item &&
      "name" in item &&
      "taxAmount" in item &&
      "isRefundable" in item,
  );

const getDashboardTaxBreakdown = (
  value: Prisma.JsonValue | null,
): DashboardTaxBreakdown => (isDashboardTaxBreakdown(value) ? value : []);

const maxDecimal = (left: Prisma.Decimal, right: Prisma.Decimal) =>
  left.greaterThan(right) ? left : right;

const getBookingPaidAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce(
      (total, payment) => total.plus(payment.amount),
      new Prisma.Decimal(0),
    );

const refundableRefundStatuses: readonly PaymentRefundStatus[] = [
  PaymentRefundStatus.PENDING,
  PaymentRefundStatus.SUCCEEDED,
] as const;

const isRefundReserved = (status: PaymentRefundStatus) =>
  refundableRefundStatuses.includes(status);

const getPaymentRefundedAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) =>
  payment.refunds
    .filter((refund) => isRefundReserved(refund.status))
    .reduce((total, refund) => total.plus(refund.amount), new Prisma.Decimal(0));

const getBookingRefundedAmount = (booking: repo.DashboardBookingRecord) =>
  booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundedAmount(payment)),
    new Prisma.Decimal(0),
  );

const getPaymentRefundableAmount = (
  payment: repo.DashboardBookingRecord["payments"][number],
) => {
  if (payment.status !== PaymentStatus.SUCCEEDED) {
    return zeroDecimal;
  }

  return maxDecimal(zeroDecimal, payment.amount.minus(getPaymentRefundedAmount(payment)));
};

const activeRefundRequestStatuses: readonly BookingRefundRequestStatus[] = [
  BookingRefundRequestStatus.REQUESTED,
  BookingRefundRequestStatus.IN_REVIEW,
];

const getBookingRefundRequest = (booking: repo.DashboardBookingRecord) =>
  booking.refundRequests.find((request) =>
    activeRefundRequestStatuses.includes(request.status),
  ) ??
  booking.refundRequests[0] ??
  null;

const getBookingPaymentStatus = (
  totalAmount: Prisma.Decimal,
  paidAmount: Prisma.Decimal,
  refundedAmount: Prisma.Decimal,
) => {
  if (paidAmount.lessThanOrEqualTo(0)) {
    return BookingPaymentStatus.PENDING;
  }

  if (refundedAmount.greaterThanOrEqualTo(paidAmount)) {
    return BookingPaymentStatus.REFUNDED;
  }

  if (paidAmount.lessThan(totalAmount)) {
    return BookingPaymentStatus.PARTIALLY_PAID;
  }

  return BookingPaymentStatus.PAID;
};

export interface DashboardBookingAssignmentLabels {
  roomsById: ReadonlyMap<string, string>;
  unitsById: ReadonlyMap<string, string>;
}

export const formatBookingRoomAssignmentLabel = (
  room: repo.DashboardBookingRoomAssignmentRecord,
) => `Unit ${room.unit.unitNumber} / Room ${room.number} (${room.name})`;

export const formatBookingUnitAssignmentLabel = (
  unit: repo.DashboardBookingUnitAssignmentRecord,
) => {
  const roomNumbers = unit.rooms
    .map((r) => r.number)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .join(", ");
  return `Unit ${unit.unitNumber} (${roomNumbers})`;
};

const getBookingAssignmentLabel = (
  input: {
    unitId: string | null;
    roomId: string | null;
    targetLabel: string;
  },
  labels?: DashboardBookingAssignmentLabels,
) => {
  if (input.roomId !== null) {
    return labels?.roomsById.get(input.roomId) ?? input.targetLabel;
  }

  if (input.unitId !== null) {
    return labels?.unitsById.get(input.unitId) ?? input.targetLabel;
  }

  return input.targetLabel;
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

export const isBookingCheckInDatePassed = (
  booking: { checkIn: Date; property: { tenant: { timezone: string } } },
  now = new Date(),
) => {
  const timeZone = booking.property.tenant.timezone;
  const currentLocal = getDateParts(now, timeZone);
  const checkInLocal = getDateParts(booking.checkIn, timeZone);
  return compareLocalDate(currentLocal, checkInLocal) > 0;
};

export const mapBooking = (
  booking: repo.DashboardBookingRecord,
  assignmentLabels?: DashboardBookingAssignmentLabels,
): DashboardBookingDTO => {
  const paidAmount = getBookingPaidAmount(booking);
  const refundedAmount = getBookingRefundedAmount(booking);
  const netPaidAmount = maxDecimal(zeroDecimal, paidAmount.minus(refundedAmount));
  const folioTotal = booking.folioCharges
    .filter((charge) => charge.status === "ACTIVE")
    .reduce((sum, charge) => sum.plus(charge.amount), zeroDecimal);
  const taxBreakdown = getDashboardTaxBreakdown(booking.taxBreakdown);
  const nonRefundableAmount = taxBreakdown
    .filter((tax) => tax.isRefundable === false)
    .reduce((sum, tax) => sum.plus(tax.taxAmount), new Prisma.Decimal(0));
  const policySnapshot = parsePolicySnapshot(booking.policySnapshot);
  const nonRefundableTokenAmount =
    policySnapshot?.tokenRefundable === false
      ? booking.payments
          .filter(
            (payment) =>
              payment.status === PaymentStatus.SUCCEEDED &&
              payment.purpose === PaymentPurpose.TOKEN,
          )
          .reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0))
      : zeroDecimal;

  const baseRefundableAmount = booking.payments.reduce(
    (total, payment) => total.plus(getPaymentRefundableAmount(payment)),
    new Prisma.Decimal(0),
  );
  const refundableAmount = maxDecimal(
    zeroDecimal,
    baseRefundableAmount.minus(nonRefundableAmount).minus(nonRefundableTokenAmount),
  );
  const getMappedPaymentRefundableAmount = (
    payment: repo.DashboardBookingRecord["payments"][number],
  ) =>
    payment.purpose === PaymentPurpose.TOKEN &&
    policySnapshot?.tokenRefundable === false
      ? zeroDecimal
      : getPaymentRefundableAmount(payment);
  const balanceAmount =
    booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.NO_SHOW
      ? zeroDecimal
      : maxDecimal(
          zeroDecimal,
          booking.totalAmount.plus(folioTotal).minus(netPaidAmount),
        );
  const refundRequest = getBookingRefundRequest(booking);
  const getPaymentMetadataValue = (
    metadata: Prisma.JsonValue,
    key: "manualReferenceId" | "manualPayerDetail",
  ) => {
    if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    const value = metadata[key];
    return typeof value === "string" && value.trim() ? value : null;
  };

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
    targetLabel: getBookingAssignmentLabel(
      {
        unitId: booking.unitId ?? null,
        roomId: booking.roomId ?? null,
        targetLabel: booking.targetLabel,
      },
      assignmentLabels,
    ),
    productName: booking.productName,
    pricePerNight: booking.pricePerNight.toString(),
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    status: booking.status,
    version: booking.version,
    checkedInAt: booking.checkedInAt ?? null,
    checkedOutAt: booking.checkedOutAt ?? null,
    noShowAt: booking.noShowAt ?? null,
    identityVerifiedAt: booking.identityVerifiedAt ?? null,
    identityDocumentType: booking.identityDocumentType ?? null,
    identityDocumentReference: booking.identityDocumentReference ?? null,
    subtotalAmount: booking.subtotalAmount.toString(),
    totalAmount: booking.totalAmount.toString(),
    discountAmount: booking.discountAmount.toString(),
    taxableAmount: booking.taxableAmount.toString(),
    taxAmount: booking.taxAmount.toString(),
    taxBreakdown,
    paymentStatus: getBookingPaymentStatus(
      booking.totalAmount.plus(folioTotal),
      paidAmount,
      refundedAmount,
    ),
    paidAmount: paidAmount.toString(),
    refundedAmount: refundedAmount.toString(),
    netPaidAmount: netPaidAmount.toString(),
    refundableAmount: refundableAmount.toString(),
    balanceAmount: balanceAmount.toString(),
    paymentPolicy: booking.paymentPolicy,
    upfrontAmount: booking.upfrontAmount.toString(),
    noShowEligible: isBookingNoShowEligible(booking),
    isCheckInDatePassed: isBookingCheckInDatePassed(booking),
    internalNotes: booking.internalNotes ?? null,
    couponCode: booking.coupon?.code ?? null,
    refundRequest:
      refundRequest === null
        ? null
        : {
            id: refundRequest.id,
            status: refundRequest.status,
            reason: refundRequest.reason,
            adminNote: refundRequest.adminNote ?? null,
            reviewedByUserId: refundRequest.reviewedByUserId ?? null,
            reviewedByName: refundRequest.reviewedBy?.fullName ?? null,
            reviewedAt: refundRequest.reviewedAt ?? null,
            fulfilledAt: refundRequest.fulfilledAt ?? null,
            createdAt: refundRequest.createdAt,
          },
    payments: booking.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      purpose: payment.purpose,
      method: payment.method,
      amount: payment.amount.toString(),
      refundedAmount: getPaymentRefundedAmount(payment).toString(),
      refundableAmount: getMappedPaymentRefundableAmount(payment).toString(),
      currency: payment.currency,
      referenceId: getPaymentMetadataValue(
        payment.metadata,
        "manualReferenceId",
      ),
      payerDetail: getPaymentMetadataValue(
        payment.metadata,
        "manualPayerDetail",
      ),
      note: payment.note ?? null,
      receivedByUserId: payment.receivedByUserId ?? null,
      paidAt: payment.paidAt ?? null,
      createdAt: payment.createdAt,
      refunds: payment.refunds.map((refund) => ({
        id: refund.id,
        refundRequestId: refund.refundRequestId ?? null,
        status: refund.status,
        method: refund.method,
        amount: refund.amount.toString(),
        currency: refund.currency,
        reason: refund.reason,
        processedAt: refund.processedAt ?? null,
        createdAt: refund.createdAt,
      })),
    })),
    items: booking.items.map((item) => ({
      id: item.id,
      targetType: item.targetType,
      unitId: item.unitId ?? null,
      roomId: item.roomId ?? null,
      productId: item.productId ?? null,
      targetLabel: getBookingAssignmentLabel(
        {
          unitId: item.unitId ?? null,
          roomId: item.roomId ?? null,
          targetLabel: item.targetLabel,
        },
        assignmentLabels,
      ),
      productName: item.productName,
      capacity: item.capacity,
      guestCount: item.guestCount,
      comfortOption: item.comfortOption,
      pricePerNight: item.pricePerNight.toString(),
      pricingId: item.pricingId ?? null,
      subtotalAmount: item.subtotalAmount.toString(),
      discountAmount: item.discountAmount.toString(),
      taxableAmount: item.taxableAmount.toString(),
      taxAmount: item.taxAmount.toString(),
      taxBreakdown: getDashboardTaxBreakdown(item.taxBreakdown),
      totalAmount: item.totalAmount.toString(),
      finalAmount: item.finalAmount.toString(),
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
    operationEvents: booking.operationEvents.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      actorUserId: event.actorUserId ?? null,
      actorName: event.actor?.fullName ?? null,
      note: event.note ?? null,
      metadata: event.metadata,
      createdAt: event.createdAt,
    })),
    folioCharges: booking.folioCharges.map((charge) => ({
      id: charge.id,
      type: charge.type,
      status: charge.status,
      description: charge.description,
      amount: charge.amount.toString(),
      note: charge.note ?? null,
      voidReason: charge.voidReason ?? null,
      createdByUserId: charge.createdByUserId,
      createdByName: charge.createdBy.fullName,
      voidedByUserId: charge.voidedByUserId ?? null,
      voidedByName: charge.voidedBy?.fullName ?? null,
      voidedAt: charge.voidedAt ?? null,
      createdAt: charge.createdAt,
    })),
    folioTotal: folioTotal.toString(),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};
