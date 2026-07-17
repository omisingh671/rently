import {
  getActor,
  assertPropertyInScope,
  ensurePropertyExists,
} from "@/common/services/scoping.service.js";
import { Prisma, UserRole } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { mapBookingPolicy } from "./booking-policy.mapper.js";
import * as repo from "./booking-policy.repository.js";
import { defaultBookingPolicyCreateData } from "./booking-policy.policy.js";
import type {
  BookingPolicyAuditDTO,
  DashboardBookingPolicyDTO,
} from "./booking-policy.dto.js";

const assertRole = (actor: { role: UserRole }, roles: readonly UserRole[]) => {
  if (!roles.includes(actor.role)) {
    throw new HttpError(403, "FORBIDDEN", "Access denied");
  }
};

export const getBookingPolicy = async (
  userId: string,
  propertyId: string,
): Promise<DashboardBookingPolicyDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);
  await assertPropertyInScope(actor, propertyId);
  await ensurePropertyExists(propertyId);

  const policy = await repo.upsertDefaultBookingPolicyByPropertyId(
    propertyId,
    defaultBookingPolicyCreateData,
  );
  return mapBookingPolicy(policy);
};

const asRuleObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const listBookingPolicyAudits = async (
  userId: string,
  propertyId: string,
): Promise<BookingPolicyAuditDTO[]> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);
  await assertPropertyInScope(actor, propertyId);
  await ensurePropertyExists(propertyId);
  const audits = await repo.listBookingPolicyAudits(propertyId);
  return audits.map((audit) => ({
    id: audit.id,
    propertyId: audit.propertyId,
    version: audit.version,
    actor: audit.actor,
    previousData: asRuleObject(audit.previousData),
    nextData: asRuleObject(audit.nextData),
    createdAt: audit.createdAt,
  }));
};

export interface UpdateBookingPolicyInput {
  expectedVersion: number;
  advancePaymentType: "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: Record<string, unknown>;
  refundRules: Record<string, unknown>;
  earlyCheckInRules?: Record<string, unknown>;
  earlyCheckoutRules: Record<string, unknown>;
  lateCheckoutRules?: Record<string, unknown>;
  downgradeRules?: Record<string, unknown>;
  noShowRules: Record<string, unknown>;
  guestPolicyText: string;
}

export const updateBookingPolicy = async (
  userId: string,
  propertyId: string,
  input: UpdateBookingPolicyInput,
): Promise<DashboardBookingPolicyDTO> => {
  const actor = await getActor(userId);
  assertRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  await assertPropertyInScope(actor, propertyId);
  await ensurePropertyExists(propertyId);

  await repo.upsertDefaultBookingPolicyByPropertyId(
    propertyId,
    defaultBookingPolicyCreateData,
  );

  const policy = await repo.updateBookingPolicyWithAudit(
    propertyId,
    input.expectedVersion,
    userId,
    {
    advancePaymentType: input.advancePaymentType,
    advancePaymentValue: new Prisma.Decimal(input.advancePaymentValue),
    tokenRefundable: input.tokenRefundable,
    checkInTime: input.checkInTime,
    checkOutTime: input.checkOutTime,
    pendingPaymentExpiryMinutes: input.pendingPaymentExpiryMinutes,
    cancellationRules: input.cancellationRules as Prisma.InputJsonValue,
    refundRules: input.refundRules as Prisma.InputJsonValue,
    ...(input.earlyCheckInRules !== undefined && {
      earlyCheckInRules: input.earlyCheckInRules as Prisma.InputJsonValue,
    }),
    earlyCheckoutRules: input.earlyCheckoutRules as Prisma.InputJsonValue,
    ...(input.lateCheckoutRules !== undefined && {
      lateCheckoutRules: input.lateCheckoutRules as Prisma.InputJsonValue,
    }),
    ...(input.downgradeRules !== undefined && {
      downgradeRules: input.downgradeRules as Prisma.InputJsonValue,
    }),
    noShowRules: input.noShowRules as Prisma.InputJsonValue,
    guestPolicyText: input.guestPolicyText,
    },
  );

  if (!policy) {
    throw new HttpError(
      409,
      "BOOKING_POLICY_VERSION_CONFLICT",
      "This policy was changed by another user. Reload it before saving again.",
    );
  }

  return mapBookingPolicy(policy);
};
