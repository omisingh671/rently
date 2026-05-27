import {
  AdvancePaymentType,
  BookingPaymentPolicy,
  Prisma,
} from "@/generated/prisma/client.js";

export type BookingPolicyRules = Record<string, unknown>;

export interface BookingPolicyShape {
  id: string;
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string | number | Prisma.Decimal;
  tokenRefundable: boolean;
  cancellationRules: Prisma.JsonValue;
  refundRules: Prisma.JsonValue;
  earlyCheckoutRules: Prisma.JsonValue;
  noShowRules: Prisma.JsonValue;
  guestPolicyText: string;
}

export interface BookingPolicySnapshot {
  version: 1;
  policyId: string;
  capturedAt: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  cancellationRules: BookingPolicyRules;
  refundRules: BookingPolicyRules;
  earlyCheckoutRules: BookingPolicyRules;
  noShowRules: BookingPolicyRules;
  guestPolicyText: string;
}

export const defaultCancellationRules: BookingPolicyRules = {
  guestCancellationAllowed: true,
  allowedStatuses: ["PENDING", "CONFIRMED"],
  beforeCheckInOnly: true,
};

export const defaultRefundRules: BookingPolicyRules = {
  tokenRefundable: false,
  manualReviewRequired: true,
};

export const defaultEarlyCheckoutRules: BookingPolicyRules = {
  refundUnusedNights: false,
  manualReviewRequired: true,
};

export const defaultNoShowRules: BookingPolicyRules = {
  markAfterCheckInCutoff: true,
  tokenRefundable: false,
};

export const defaultGuestPolicyText =
  "Token, cancellation, refund, early checkout, and no-show rules are governed by this property policy. Refunds may require review by the property team.";

const toInputJson = (value: BookingPolicyRules): Prisma.InputJsonValue =>
  value as Prisma.InputJsonValue;

export const defaultBookingPolicyCreateData: Omit<
  Prisma.PropertyBookingPolicyCreateWithoutPropertyInput,
  "id" | "createdAt" | "updatedAt"
> = {
  advancePaymentType: AdvancePaymentType.FIXED_AMOUNT,
  advancePaymentValue: new Prisma.Decimal(10),
  tokenRefundable: false,
  cancellationRules: toInputJson(defaultCancellationRules),
  refundRules: toInputJson(defaultRefundRules),
  earlyCheckoutRules: toInputJson(defaultEarlyCheckoutRules),
  noShowRules: toInputJson(defaultNoShowRules),
  guestPolicyText: defaultGuestPolicyText,
};

const toRules = (value: Prisma.JsonValue): BookingPolicyRules =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as BookingPolicyRules)
    : {};

export const buildPolicySnapshot = (
  policy: BookingPolicyShape,
  capturedAt: Date,
): BookingPolicySnapshot => ({
  version: 1,
  policyId: policy.id,
  capturedAt: capturedAt.toISOString(),
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: new Prisma.Decimal(policy.advancePaymentValue).toString(),
  tokenRefundable: policy.tokenRefundable,
  cancellationRules: toRules(policy.cancellationRules),
  refundRules: toRules(policy.refundRules),
  earlyCheckoutRules: toRules(policy.earlyCheckoutRules),
  noShowRules: toRules(policy.noShowRules),
  guestPolicyText: policy.guestPolicyText,
});

export const parsePolicySnapshot = (
  value: Prisma.JsonValue | null,
): BookingPolicySnapshot | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== 1 ||
    typeof candidate.policyId !== "string" ||
    typeof candidate.capturedAt !== "string" ||
    typeof candidate.advancePaymentType !== "string" ||
    typeof candidate.advancePaymentValue !== "string" ||
    typeof candidate.tokenRefundable !== "boolean" ||
    typeof candidate.guestPolicyText !== "string"
  ) {
    return null;
  }

  return {
    version: 1,
    policyId: candidate.policyId,
    capturedAt: candidate.capturedAt,
    advancePaymentType: candidate.advancePaymentType as AdvancePaymentType,
    advancePaymentValue: candidate.advancePaymentValue,
    tokenRefundable: candidate.tokenRefundable,
    cancellationRules:
      candidate.cancellationRules !== null &&
      typeof candidate.cancellationRules === "object" &&
      !Array.isArray(candidate.cancellationRules)
        ? (candidate.cancellationRules as BookingPolicyRules)
        : {},
    refundRules:
      candidate.refundRules !== null &&
      typeof candidate.refundRules === "object" &&
      !Array.isArray(candidate.refundRules)
        ? (candidate.refundRules as BookingPolicyRules)
        : {},
    earlyCheckoutRules:
      candidate.earlyCheckoutRules !== null &&
      typeof candidate.earlyCheckoutRules === "object" &&
      !Array.isArray(candidate.earlyCheckoutRules)
        ? (candidate.earlyCheckoutRules as BookingPolicyRules)
        : {},
    noShowRules:
      candidate.noShowRules !== null &&
      typeof candidate.noShowRules === "object" &&
      !Array.isArray(candidate.noShowRules)
        ? (candidate.noShowRules as BookingPolicyRules)
        : {},
    guestPolicyText: candidate.guestPolicyText,
  };
};

export const calculatePolicyAdvanceAmount = (
  policy: Pick<BookingPolicyShape, "advancePaymentType" | "advancePaymentValue">,
  totalAmount: string | number | Prisma.Decimal,
) => {
  const total = new Prisma.Decimal(totalAmount);
  const value = new Prisma.Decimal(policy.advancePaymentValue);

  if (policy.advancePaymentType === AdvancePaymentType.NONE) {
    return new Prisma.Decimal(0);
  }

  if (policy.advancePaymentType === AdvancePaymentType.PERCENTAGE) {
    const percentageAmount = total.mul(value).div(100);
    return percentageAmount.greaterThan(total) ? total : percentageAmount;
  }

  return value.greaterThan(total) ? total : value;
};

export const getPaymentPolicyForAdvanceType = (
  advancePaymentType: AdvancePaymentType,
) =>
  advancePaymentType === AdvancePaymentType.NONE
    ? BookingPaymentPolicy.NO_UPFRONT_PAYMENT
    : BookingPaymentPolicy.TOKEN_AT_BOOKING;
