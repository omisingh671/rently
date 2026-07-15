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
import type { DashboardBookingPolicyDTO } from "./booking-policy.dto.js";

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

export interface UpdateBookingPolicyInput {
  advancePaymentType: "NONE" | "FIXED_AMOUNT" | "PERCENTAGE";
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
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

  const policy = await repo.upsertBookingPolicyByPropertyId(propertyId, {
    advancePaymentType: input.advancePaymentType,
    advancePaymentValue: new Prisma.Decimal(input.advancePaymentValue),
    tokenRefundable: input.tokenRefundable,
    checkInTime: input.checkInTime,
    checkOutTime: input.checkOutTime,
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
  });

  return mapBookingPolicy(policy);
};
