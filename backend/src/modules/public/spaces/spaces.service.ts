import {
  ComfortOption,
  BookingTargetType,
  Prisma,
} from "@/generated/prisma/client.js";
import { prisma } from "@/db/prisma.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  defaultBookingPolicyCreateData,
  type BookingPolicyShape,
} from "@/modules/booking-policy/booking-policy.policy.js";
import * as repo from "./spaces.repository.js";
import * as tenantService from "@/modules/public/tenant/tenant.service.js";
import type { TenantResolutionInput } from "@/modules/public/tenant/tenant.inputs.js";
import type { PublicSpaceDTO, PublicBookingPolicyDTO } from "./spaces.dto.js";

const now = () => new Date();

export const getSpaceTarget = (space: repo.PublicSpaceRecord): repo.PublicSpaceTarget => {
  if (space.roomId) {
    return {
      targetType: BookingTargetType.ROOM,
      unitId: space.room?.unitId ?? null,
      roomId: space.roomId,
    };
  }

  if (space.unitId) {
    return {
      targetType: BookingTargetType.UNIT,
      unitId: space.unitId,
      roomId: null,
    };
  }

  throw new HttpError(
    422,
    "SPACE_NOT_BOOKABLE",
    "Space is missing a bookable target",
  );
};

export const getSpaceCapacity = (space: repo.PublicSpaceRecord) =>
  space.room?.maxOccupancy ?? space.product.occupancy;

export const getSpaceComfortOption = (space: repo.PublicSpaceRecord) =>
  space.product.hasAC ? ComfortOption.AC : ComfortOption.NON_AC;

const getSpaceTitle = (space: repo.PublicSpaceRecord) => {
  if (space.room) {
    return `${space.property.name} - Private Room`;
  }

  return `${space.property.name} - Whole Unit`;
};

const getSpaceLocation = (space: repo.PublicSpaceRecord) =>
  `${space.property.city}, ${space.property.state}`;

export const mapSpace = (space: repo.PublicSpaceRecord): PublicSpaceDTO => {
  const target = getSpaceTarget(space);

  return {
    id: space.id,
    propertyId: space.propertyId,
    title: getSpaceTitle(space),
    description: `${space.product.category.toLowerCase()} stay at ${space.property.name}`,
    pricePerNight: Number(space.price),
    capacity: getSpaceCapacity(space),
    guestCount: space.product.occupancy,
    hasAC: space.room?.hasAC ?? space.product.hasAC,
    comfortOption: getSpaceComfortOption(space),
    location: getSpaceLocation(space),
    targetType: target.targetType,
    unitId: target.unitId,
    roomId: target.roomId,
  };
};

const asRuleObject = (value: Prisma.JsonValue): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const mapPolicy = (policy: BookingPolicyShape): PublicBookingPolicyDTO => ({
  propertyId: policy.propertyId,
  advancePaymentType: policy.advancePaymentType,
  advancePaymentValue: Number(policy.advancePaymentValue),
  tokenRefundable: policy.tokenRefundable,
  checkInTime: policy.checkInTime,
  checkOutTime: policy.checkOutTime,
  cancellationRules: asRuleObject(policy.cancellationRules),
  refundRules: asRuleObject(policy.refundRules),
  earlyCheckoutRules: asRuleObject(policy.earlyCheckoutRules),
  noShowRules: asRuleObject(policy.noShowRules),
  guestPolicyText: policy.guestPolicyText,
});

export const ensureBookingPolicy = async (
  propertyId: string,
  tx?: Prisma.TransactionClient,
) =>
  repo.upsertDefaultBookingPolicyByPropertyId(
    propertyId,
    defaultBookingPolicyCreateData,
    tx,
  );

export const listSpaces = async (
  input: TenantResolutionInput = {},
): Promise<PublicSpaceDTO[]> => {
  const scope = await tenantService.resolvePublicScope(input);
  const spaces = await repo.listActiveSpaces(
    now(),
    undefined,
    scope.tenant.id,
    undefined,
    undefined,
    undefined,
    scope.propertyScope,
  );
  return spaces.map(mapSpace);
};

export const getSpaceById = async (
  id: string,
  input: TenantResolutionInput = {},
): Promise<PublicSpaceDTO> => {
  const scope = await tenantService.resolvePublicScope(input);
  const space = await repo.findActiveSpaceById(
    id,
    now(),
    scope.tenant.id,
    undefined,
    undefined,
    scope.propertyScope,
  );
  if (!space) {
    throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
  }

  return mapSpace(space);
};

export const getPropertyBookingPolicy = async (
  propertyId: string,
  input: TenantResolutionInput = {},
): Promise<PublicBookingPolicyDTO> => {
  const tenant = await tenantService.resolveTenant(input);
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      tenantId: tenant.id,
      isActive: true,
      status: "ACTIVE",
    },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  return mapPolicy(await ensureBookingPolicy(property.id));
};
