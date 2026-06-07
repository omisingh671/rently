import type { PaginatedResult } from "@/common/types/pagination.js";
import type { DashboardRoomPricingDTO } from "./pricing.dto.js";
import type * as repo from "./pricing.repository.js";

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
