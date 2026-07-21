import { prisma } from "@/db/prisma.js";
import { isDeepStrictEqual } from "node:util";
import type { AdvancePaymentType, Prisma } from "@/generated/prisma/client.js";

export interface BookingPolicyUpdateData {
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: Prisma.Decimal;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: Prisma.InputJsonValue;
  refundRules: Prisma.InputJsonValue;
  earlyCheckInRules: Prisma.InputJsonValue;
  earlyCheckoutRules: Prisma.InputJsonValue;
  lateCheckoutRules: Prisma.InputJsonValue;
  downgradeRules: Prisma.InputJsonValue;
  noShowRules: Prisma.InputJsonValue;
  guestPolicyText: string;
}

export const findBookingPolicyByPropertyId = (propertyId: string) =>
  prisma.propertyBookingPolicy.findUnique({
    where: { propertyId },
  });

export const listBookingPolicyAudits = (propertyId: string) =>
  prisma.bookingPolicyAudit.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      actor: { select: { id: true, fullName: true, email: true } },
    },
  });

const toAuditJson = (policy: {
  advancePaymentType: string;
  advancePaymentValue: Prisma.Decimal;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: Prisma.JsonValue;
  refundRules: Prisma.JsonValue;
  earlyCheckInRules: Prisma.JsonValue;
  earlyCheckoutRules: Prisma.JsonValue;
  lateCheckoutRules: Prisma.JsonValue;
  downgradeRules: Prisma.JsonValue;
  noShowRules: Prisma.JsonValue;
  guestPolicyText: string;
  version: number;
}): Prisma.InputJsonValue =>
  JSON.parse(
    JSON.stringify({
      advancePaymentType: policy.advancePaymentType,
      advancePaymentValue: policy.advancePaymentValue.toString(),
      tokenRefundable: policy.tokenRefundable,
      checkInTime: policy.checkInTime,
      checkOutTime: policy.checkOutTime,
      pendingPaymentExpiryMinutes: policy.pendingPaymentExpiryMinutes,
      cancellationRules: policy.cancellationRules,
      refundRules: policy.refundRules,
      earlyCheckInRules: policy.earlyCheckInRules,
      earlyCheckoutRules: policy.earlyCheckoutRules,
      lateCheckoutRules: policy.lateCheckoutRules,
      downgradeRules: policy.downgradeRules,
      noShowRules: policy.noShowRules,
      guestPolicyText: policy.guestPolicyText,
      version: policy.version,
    }),
  ) as unknown as Prisma.InputJsonValue;

const toComparablePolicy = (policy: {
  advancePaymentType: string;
  advancePaymentValue: Prisma.Decimal;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: Prisma.JsonValue;
  refundRules: Prisma.JsonValue;
  earlyCheckInRules: Prisma.JsonValue;
  earlyCheckoutRules: Prisma.JsonValue;
  lateCheckoutRules: Prisma.JsonValue;
  downgradeRules: Prisma.JsonValue;
  noShowRules: Prisma.JsonValue;
  guestPolicyText: string;
}) => ({
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: policy.advancePaymentValue.toString(),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  pendingPaymentExpiryMinutes: policy.pendingPaymentExpiryMinutes,
  cancellationRules: policy.cancellationRules,
  refundRules: policy.refundRules,
  earlyCheckInRules: policy.earlyCheckInRules,
  earlyCheckoutRules: policy.earlyCheckoutRules,
  lateCheckoutRules: policy.lateCheckoutRules,
  downgradeRules: policy.downgradeRules,
  noShowRules: policy.noShowRules,
  guestPolicyText: policy.guestPolicyText,
});

const toComparableUpdate = (data: BookingPolicyUpdateData) => ({
  ...data,
  advancePaymentValue: data.advancePaymentValue.toString(),
});

export const updateBookingPolicyWithAudit = (
  propertyId: string,
  expectedVersion: number,
  actorUserId: string,
  data: BookingPolicyUpdateData,
) =>
  prisma.$transaction(async (tx) => {
    const previous = await tx.propertyBookingPolicy.findUnique({
      where: { propertyId },
    });
    if (!previous || previous.version !== expectedVersion) {
      return null;
    }
    if (
      isDeepStrictEqual(toComparablePolicy(previous), toComparableUpdate(data))
    ) {
      return previous;
    }

    const result = await tx.propertyBookingPolicy.updateMany({
      where: { propertyId, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      return null;
    }

    const next = await tx.propertyBookingPolicy.findUniqueOrThrow({
      where: { propertyId },
    });
    await tx.bookingPolicyAudit.create({
      data: {
        policyId: next.id,
        propertyId,
        actorUserId,
        version: next.version,
        previousData: toAuditJson(previous),
        nextData: toAuditJson(next),
      },
    });

    return next;
  });

export const upsertDefaultBookingPolicyByPropertyId = (
  propertyId: string,
  data: Omit<
    Prisma.PropertyBookingPolicyCreateWithoutPropertyInput,
    "id" | "createdAt" | "updatedAt"
  >,
) =>
  prisma.propertyBookingPolicy.upsert({
    where: { propertyId },
    create: {
      property: { connect: { id: propertyId } },
      ...data,
    },
    update: {},
  });
