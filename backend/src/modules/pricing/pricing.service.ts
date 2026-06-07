import { RateType, PricingTier } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import { getActor, assertCanManageInventory } from "@/common/services/scoping.service.js";
import * as repo from "./pricing.repository.js";
import { mapRoomPricing, normalizePaginationResult } from "./pricing.mapper.js";
import type {
  DashboardRoomPricingListInput,
  CreateDashboardRoomPricingInput,
  UpdateDashboardRoomPricingInput,
} from "./pricing.inputs.js";
import type { DashboardRoomPricingDTO } from "./pricing.dto.js";

const ensurePropertyExists = async (propertyId: string) => {
  const property = await repo.findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  return property;
};

const ensureUnitExists = async (unitId: string) => {
  const unit = await repo.findUnitById(unitId);
  if (!unit) {
    throw new HttpError(404, "UNIT_NOT_FOUND", "Unit not found");
  }
  return unit;
};

const ensureRoomExists = async (roomId: string) => {
  const room = await repo.findRoomById(roomId);
  if (!room) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }
  return room;
};

const ensureRoomProductExists = async (productId: string) => {
  const product = await repo.findRoomProductById(productId);
  if (!product) {
    throw new HttpError(
      404,
      "ROOM_PRODUCT_NOT_FOUND",
      "Room product not found",
    );
  }
  return product;
};

const ensureRoomPricingExists = async (pricingId: string) => {
  const pricing = await repo.findRoomPricingById(pricingId);
  if (!pricing) {
    throw new HttpError(
      404,
      "ROOM_PRICING_NOT_FOUND",
      "Room pricing not found",
    );
  }
  return pricing;
};

const ensureUnitBelongsToProperty = (
  unit: Awaited<ReturnType<typeof repo.findUnitById>>,
  propertyId: string,
) => {
  if (!unit || unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_UNIT",
      "Unit does not belong to the selected property",
    );
  }
};

const ensureRoomBelongsToProperty = (
  room: Awaited<ReturnType<typeof repo.findRoomById>>,
  propertyId: string,
) => {
  if (!room || room.unit.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_ROOM",
      "Room does not belong to the selected property",
    );
  }
};

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

const assertValidNightRange = (minNights?: number, maxNights?: number) => {
  if (
    minNights !== undefined &&
    maxNights !== undefined &&
    maxNights < minNights
  ) {
    throw new HttpError(
      400,
      "INVALID_NIGHT_RANGE",
      "Max nights must be greater than or equal to min nights",
    );
  }
};

const ensureRoomProductBelongsToProperty = (
  product: {
    propertyId: string;
  },
  propertyId: string,
) => {
  if (product.propertyId !== propertyId) {
    throw new HttpError(
      400,
      "INVALID_PRODUCT",
      "Room product does not belong to the selected property",
    );
  }
};

const assertRoomPricingComfortSupported = async (
  target: {
    roomId?: string | undefined;
  },
  product: {
    hasAC: boolean;
  },
) => {
  if (!target.roomId || !product.hasAC) {
    return;
  }

  const room = await ensureRoomExists(target.roomId);
  if (!room.hasAC) {
    throw new HttpError(
      422,
      "COMFORT_OPTION_NOT_AVAILABLE",
      "Selected room does not support AC pricing",
    );
  }
};

const resolvePricingTarget = async (
  propertyId: string,
  input: {
    unitId?: string | null | undefined;
    roomId?: string | null | undefined;
  },
) => {
  if (input.unitId && input.roomId) {
    throw new HttpError(
      400,
      "INVALID_PRICING_TARGET",
      "Use either unitId or roomId, not both",
    );
  }

  if (input.unitId) {
    const unit = await ensureUnitExists(input.unitId);
    ensureUnitBelongsToProperty(unit, propertyId);

    return {
      unitId: unit.id,
      roomId: undefined,
    };
  }

  if (input.roomId) {
    const room = await ensureRoomExists(input.roomId);
    ensureRoomBelongsToProperty(room, propertyId);

    return {
      unitId: undefined,
      roomId: room.id,
    };
  }

  return {
    unitId: undefined,
    roomId: undefined,
  };
};

const assertNoOverlappingRoomPricing = async (
  propertyId: string,
  input: {
    productId: string;
    target: {
      unitId?: string | null | undefined;
      roomId?: string | null | undefined;
    };
    rateType: RateType;
    validFrom: Date;
    validTo?: Date | null | undefined;
    excludePricingId?: string;
  },
) => {
  const overlapping = await repo.findOverlappingRoomPricing({
    propertyId,
    productId: input.productId,
    unitId: input.target.unitId ?? null,
    roomId: input.target.roomId ?? null,
    rateType: input.rateType,
    validFrom: input.validFrom,
    ...(input.validTo !== undefined && { validTo: input.validTo }),
    ...(input.excludePricingId !== undefined && {
      excludePricingId: input.excludePricingId,
    }),
  });

  if (overlapping) {
    throw new HttpError(
      409,
      "ROOM_PRICING_OVERLAP",
      "An overlapping price rule already exists for this rate product, scope, and date range",
    );
  }
};

export const listRoomPricing = async (
  userId: string,
  filters: DashboardRoomPricingListInput,
) => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomPricingPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(mapRoomPricing),
  );
};

export const createRoomPricing = async (
  userId: string,
  propertyId: string,
  input: CreateDashboardRoomPricingInput,
): Promise<DashboardRoomPricingDTO> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);
  assertValidOptionalDateRange(input.validFrom, input.validTo);
  assertValidNightRange(input.minNights ?? 1, input.maxNights);

  const product = await ensureRoomProductExists(input.productId);
  ensureRoomProductBelongsToProperty(product, propertyId);
  const target = await resolvePricingTarget(propertyId, input);
  await assertRoomPricingComfortSupported(target, product);
  await assertNoOverlappingRoomPricing(propertyId, {
    productId: input.productId,
    target,
    rateType: input.rateType ?? RateType.NIGHTLY,
    validFrom: input.validFrom,
    validTo: input.validTo,
  });

  const pricing = await repo.createRoomPricing({
    property: {
      connect: {
        id: propertyId,
      },
    },
    product: {
      connect: {
        id: input.productId,
      },
    },
    ...(target.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
    }),
    ...(target.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
    }),
    rateType: input.rateType ?? RateType.NIGHTLY,
    pricingTier: input.pricingTier ?? PricingTier.STANDARD,
    minNights: input.minNights ?? 1,
    ...(input.maxNights !== undefined && { maxNights: input.maxNights }),
    taxInclusive: input.taxInclusive ?? false,
    price: input.price,
    validFrom: input.validFrom,
    ...(input.validTo !== undefined && { validTo: input.validTo }),
  });

  return mapRoomPricing(pricing);
};

export const updateRoomPricing = async (
  userId: string,
  pricingId: string,
  input: UpdateDashboardRoomPricingInput,
): Promise<DashboardRoomPricingDTO> => {
  const actor = await getActor(userId);
  const existingPricing = await ensureRoomPricingExists(pricingId);
  await assertCanManageInventory(actor, existingPricing.propertyId);

  const nextValidFrom = input.validFrom ?? existingPricing.validFrom;
  const nextValidTo = input.validTo ?? existingPricing.validTo ?? undefined;
  assertValidOptionalDateRange(nextValidFrom, nextValidTo);
  assertValidNightRange(
    input.minNights ?? existingPricing.minNights,
    input.maxNights ?? existingPricing.maxNights ?? undefined,
  );

  const nextProduct =
    input.productId !== undefined
      ? await ensureRoomProductExists(input.productId)
      : existingPricing.product;
  ensureRoomProductBelongsToProperty(nextProduct, existingPricing.propertyId);

  const target =
    input.unitId !== undefined || input.roomId !== undefined
      ? await resolvePricingTarget(existingPricing.propertyId, input)
      : undefined;
  await assertRoomPricingComfortSupported(
    target ?? {
      roomId: existingPricing.roomId ?? undefined,
    },
    nextProduct,
  );
  await assertNoOverlappingRoomPricing(existingPricing.propertyId, {
    productId: nextProduct.id,
    target:
      target ??
      {
        unitId: existingPricing.roomId ? undefined : existingPricing.unitId,
        roomId: existingPricing.roomId ?? undefined,
      },
    rateType: input.rateType ?? existingPricing.rateType,
    validFrom: nextValidFrom,
    validTo: nextValidTo,
    excludePricingId: pricingId,
  });

  const pricing = await repo.updateRoomPricingById(pricingId, {
    ...(input.productId !== undefined && {
      product: {
        connect: {
          id: input.productId,
        },
      },
    }),
    ...(target?.unitId !== undefined && {
      unit: {
        connect: {
          id: target.unitId,
        },
      },
      room: {
        disconnect: true,
      },
    }),
    ...(target?.roomId !== undefined && {
      room: {
        connect: {
          id: target.roomId,
        },
      },
      unit: {
        disconnect: true,
      },
    }),
    ...(target !== undefined &&
      target.unitId === undefined &&
      target.roomId === undefined && {
        unit: {
          disconnect: true,
        },
        room: {
          disconnect: true,
        },
      }),
    ...(input.rateType !== undefined && { rateType: input.rateType }),
    ...(input.pricingTier !== undefined && {
      pricingTier: input.pricingTier,
    }),
    ...(input.minNights !== undefined && { minNights: input.minNights }),
    ...(input.maxNights !== undefined && { maxNights: input.maxNights }),
    ...(input.taxInclusive !== undefined && {
      taxInclusive: input.taxInclusive,
    }),
    ...(input.price !== undefined && { price: input.price }),
    ...(input.validFrom !== undefined && { validFrom: input.validFrom }),
    ...(input.validTo !== undefined && { validTo: input.validTo }),
  });

  return mapRoomPricing(pricing);
};

export const deleteRoomPricing = async (
  userId: string,
  pricingId: string,
): Promise<void> => {
  const actor = await getActor(userId);
  const pricing = await ensureRoomPricingExists(pricingId);
  await assertCanManageInventory(actor, pricing.propertyId);
  await repo.deleteRoomPricingById(pricingId);
};
