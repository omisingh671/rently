import { createHash } from "node:crypto";
import { FolioChargeStatus, Prisma } from "@/generated/prisma/client.js";
import {
  defaultBookingPolicyCreateData,
  parsePolicySnapshot,
} from "@/modules/booking-policy/booking-policy.policy.js";
import {
  buildStayPolicySnapshot,
  buildStayPolicySnapshotFromBooking,
} from "@/modules/booking-policy/stay-policy.js";
import type {
  BookingCheckInPolicyPreviewDTO,
  BookingCheckOutPolicyPreviewDTO,
} from "./bookings.dto.js";
import { buildLateCheckoutExtensionPreview } from "./bookings.assignment.js";
import { getBookingRefundableAmount } from "./bookings.financials.js";
import { findMatchingLateCheckoutExtensionCharge } from "./bookings.helper.js";
import type { findTransactionBooking } from "./bookings.lifecycle.js";

type TransactionBooking = Awaited<ReturnType<typeof findTransactionBooking>>;

export const applyLateCheckoutPolicy = (
  rawPreview: NonNullable<BookingCheckOutPolicyPreviewDTO["lateCheckoutCharge"]>,
  policySnapshot: ReturnType<typeof buildStayPolicySnapshot>,
) => {
  const multiplier = new Prisma.Decimal(policySnapshot.lateCheckout.feeValue);
  const fixedBase = new Prisma.Decimal(policySnapshot.lateCheckout.feeValue).times(
    rawPreview.extraNights,
  );
  const baseAmount =
    policySnapshot.lateCheckout.feeType === "FIXED_AMOUNT"
      ? fixedBase
      : new Prisma.Decimal(rawPreview.baseAmount).times(multiplier);
  const taxAmount =
    policySnapshot.lateCheckout.feeType === "FIXED_AMOUNT"
      ? new Prisma.Decimal(0)
      : new Prisma.Decimal(rawPreview.taxAmount).times(multiplier);
  return {
    ...rawPreview,
    baseAmount: baseAmount.toDecimalPlaces(2).toString(),
    taxAmount: taxAmount.toDecimalPlaces(2).toString(),
    totalAmount: baseAmount.plus(taxAmount).toDecimalPlaces(2).toString(),
    tariffType: policySnapshot.lateCheckout.feeType,
    tariffValue: policySnapshot.lateCheckout.feeValue,
    policySnapshot,
  };
};

export const buildLateCheckoutPolicyPreview = async (
  tx: Prisma.TransactionClient,
  booking: TransactionBooking,
  policySnapshot: ReturnType<typeof buildStayPolicySnapshot>,
  now = new Date(),
) => {
  const timeZone = booking.property.tenant.timezone;
  const current = localParts(now, timeZone);
  const departure = localParts(booking.checkOut, timeZone);
  const [hour = 0, minute = 0] = policySnapshot.checkOutTime
    .split(":")
    .map(Number);
  const sameDayLate =
    current.date === departure.date &&
    current.minutes >
      hour * 60 + minute + policySnapshot.lateCheckout.graceMinutes;
  const pricingThrough = sameDayLate
    ? new Date(booking.checkOut.getTime() + 86_400_000)
    : now;
  const rawPreview = await buildLateCheckoutExtensionPreview(
    booking,
    tx,
    pricingThrough,
  );
  if (!rawPreview) return null;
  const applied = applyLateCheckoutPolicy(rawPreview, policySnapshot);
  return sameDayLate
    ? { ...applied, actualCheckOutDate: current.date }
    : applied;
};

const localParts = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
};
const dateDiff = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      86_400_000,
  );
const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const loadPolicy = async (tx: Prisma.TransactionClient, propertyId: string) =>
  tx.propertyBookingPolicy.upsert({
    where: { propertyId },
    create: { propertyId, ...defaultBookingPolicyCreateData },
    update: {},
  });

const getStayPolicySnapshot = async (
  tx: Prisma.TransactionClient,
  booking: TransactionBooking,
  capturedAt: Date,
) => {
  const bookingPolicy = parsePolicySnapshot(booking.policySnapshot);
  if (bookingPolicy) {
    return buildStayPolicySnapshotFromBooking(bookingPolicy);
  }

  return buildStayPolicySnapshot(
    await loadPolicy(tx, booking.propertyId),
    capturedAt,
  );
};

export const buildCheckInPolicyPreview = async (
  tx: Prisma.TransactionClient,
  booking: TransactionBooking,
  now = new Date(),
): Promise<BookingCheckInPolicyPreviewDTO> => {
  const policySnapshot = await getStayPolicySnapshot(tx, booking, now);
  const timeZone = booking.property.tenant.timezone;
  const current = localParts(now, timeZone);
  const arrival = localParts(booking.checkIn, timeZone);
  const [hour = 0, minute = 0] = policySnapshot.checkInTime.split(":").map(Number);
  const isEarly = current.date === arrival.date && current.minutes < hour * 60 + minute;
  const result = {
    bookingId: booking.id,
    bookingVersion: booking.version,
    isEarly,
    allowed: !isEarly || policySnapshot.earlyCheckIn.enabled,
    scheduledCheckInTime: policySnapshot.checkInTime,
    feeAmount:
      isEarly && policySnapshot.earlyCheckIn.feeType === "FIXED_AMOUNT"
        ? new Prisma.Decimal(policySnapshot.earlyCheckIn.feeValue).toFixed(2)
        : "0",
    policySnapshot,
  };
  return {
    ...result,
    policyFingerprint: fingerprint({
      ...result,
      policySnapshot: { ...policySnapshot, capturedAt: "" },
    }),
  };
};

export const buildCheckOutPolicyPreview = async (
  tx: Prisma.TransactionClient,
  booking: TransactionBooking,
  now = new Date(),
): Promise<BookingCheckOutPolicyPreviewDTO> => {
  const policySnapshot = await getStayPolicySnapshot(tx, booking, now);
  const timeZone = booking.property.tenant.timezone;
  const current = localParts(now, timeZone);
  const arrival = localParts(booking.checkIn, timeZone);
  const departure = localParts(booking.checkOut, timeZone);
  const unusedNights = Math.max(0, dateDiff(current.date, departure.date));
  const totalNights = Math.max(1, dateDiff(arrival.date, departure.date));
  const isEarly = unusedNights > 0;
  const calculatedRefund = policySnapshot.earlyCheckout.refundUnusedNights
    ? new Prisma.Decimal(booking.totalAmount)
        .div(totalNights)
        .times(unusedNights)
        .times(policySnapshot.earlyCheckout.refundPercentage)
        .div(100)
    : new Prisma.Decimal(0);
  const refundAmount = Prisma.Decimal.min(
    calculatedRefund,
    getBookingRefundableAmount(booking),
  ).toDecimalPlaces(2);
  const calculatedLateCheckoutCharge = await buildLateCheckoutPolicyPreview(
    tx,
    booking,
    policySnapshot,
    now,
  );
  const matchingLateCheckoutCharge = calculatedLateCheckoutCharge
    ? findMatchingLateCheckoutExtensionCharge(
        booking.folioCharges,
        calculatedLateCheckoutCharge,
      )
    : null;
  const lateCheckoutCharge =
    matchingLateCheckoutCharge?.status === FolioChargeStatus.VOID
      ? null
      : calculatedLateCheckoutCharge;
  const result = {
    bookingId: booking.id,
    bookingVersion: booking.version,
    isEarly,
    unusedNights,
    refundAmount: refundAmount.toString(),
    manualReviewRequired: policySnapshot.earlyCheckout.manualReviewRequired,
    lateCheckoutCharge,
    policySnapshot,
  };
  return {
    ...result,
    policyFingerprint: fingerprint({
      ...result,
      policySnapshot: { ...policySnapshot, capturedAt: "" },
      lateCheckoutCharge: lateCheckoutCharge
        ? {
            ...lateCheckoutCharge,
            policySnapshot: {
              ...lateCheckoutCharge.policySnapshot,
              capturedAt: "",
            },
          }
        : null,
    }),
  };
};
