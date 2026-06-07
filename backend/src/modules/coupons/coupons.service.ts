import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  assertCanManageInventory,
  ensurePropertyExists,
} from "@/common/services/scoping.service.js";
import * as repo from "./coupons.repository.js";
import { mapCoupon } from "./coupons.mapper.js";
import { normalizePaginationResult } from "@/common/types/pagination.js";
import type {
  CreateDashboardCouponInput,
  DashboardCouponListInput,
  UpdateDashboardCouponInput,
} from "./coupons.inputs.js";
import type { DashboardCouponDTO } from "./coupons.dto.js";

const assertValidOptionalDateRange = (
  validFrom?: Date,
  validTo?: Date,
) => {
  if (
    validFrom !== undefined &&
    validTo !== undefined &&
    validTo.getTime() < validFrom.getTime()
  ) {
    throw new HttpError(
      400,
      "INVALID_DATE_RANGE",
      "End date must be on or after start date",
    );
  }
};

const ensureCouponExists = async (couponId: string) => {
  const coupon = await repo.findCouponById(couponId);
  if (!coupon) {
    throw new HttpError(404, "COUPON_NOT_FOUND", "Coupon not found");
  }
  return coupon;
};

export const listCoupons = async (
  userId: string,
  filters: DashboardCouponListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listCouponsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapCoupon),
  );
};

export const createCoupon = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardCouponInput,
): Promise<DashboardCouponDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  assertValidOptionalDateRange(input.validFrom, input.validTo);

  try {
    const coupon = await repo.createCoupon({
      property: {
        connect: {
          id: propertyId,
        },
      },
      code: input.code.toUpperCase(),
      name: input.name,
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      discountValue: input.discountValue,
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.minNights !== undefined && { minNights: input.minNights }),
      ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
      validFrom: input.validFrom,
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.oncePerUser !== undefined && { oncePerUser: input.oncePerUser }),
    });

    return mapCoupon(coupon);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "COUPON_EXISTS", "Coupon already exists");
    }

    throw error;
  }
};

export const updateCoupon = async (
  userId: string,
  couponId: string,
  input: UpdateDashboardCouponInput,
): Promise<DashboardCouponDTO> => {
  const actor = await getActor(userId);
  const existingCoupon = await ensureCouponExists(couponId);
  await assertCanManageInventory(actor, existingCoupon.propertyId);
  assertValidOptionalDateRange(
    input.validFrom ?? existingCoupon.validFrom,
    input.validTo ?? existingCoupon.validTo ?? undefined,
  );

  try {
    const coupon = await repo.updateCouponById(couponId, {
      ...(input.code !== undefined && { code: input.code.toUpperCase() }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.discountType !== undefined && {
        discountType: input.discountType,
      }),
      ...(input.discountValue !== undefined && {
        discountValue: input.discountValue,
      }),
      ...(input.maxUses !== undefined && { maxUses: input.maxUses }),
      ...(input.minNights !== undefined && { minNights: input.minNights }),
      ...(input.minAmount !== undefined && { minAmount: input.minAmount }),
      ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
      ...(input.validTo !== undefined && { validTo: input.validTo }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.oncePerUser !== undefined && { oncePerUser: input.oncePerUser }),
    });

    return mapCoupon(coupon);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(409, "COUPON_EXISTS", "Coupon already exists");
    }

    throw error;
  }
};
