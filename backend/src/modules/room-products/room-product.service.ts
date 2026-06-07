import { Prisma } from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { RoomProductCategory } from "@/generated/prisma/enums.js";
import type { PaginatedResult } from "@/common/types/pagination.js";
import {
  getActor,
  assertCanManageInventory,
} from "@/common/services/scoping.service.js";
import { findPropertyById } from "../properties/properties.repository.js";
import * as repo from "./room-product.repository.js";
import { toRoomProductResponseDto } from "./room-product.mapper.js";
import type { RoomProductResponseDto } from "./room-product.dto.js";

// Pagination Helpers
const buildPagination = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: total === 0 ? 0 : Math.ceil(total / limit),
});

const normalizePaginationResult = <T>(
  page: number,
  limit: number,
  total: number,
  items: T[],
): PaginatedResult<T> => ({
  items,
  pagination: buildPagination(page, limit, total),
});

const ensurePropertyExists = async (propertyId: string) => {
  const property = await findPropertyById(propertyId);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  return property;
};

const ensureRoomProductExists = async (productId: string) => {
  const product = await repo.findRoomProductById(productId);
  if (!product) {
    throw new HttpError(404, "ROOM_PRODUCT_NOT_FOUND", "Room product not found");
  }
  return product;
};

// Room Products Service API
export const listRoomProducts = async (
  userId: string,
  filters: repo.RoomProductListFilters,
): Promise<PaginatedResult<RoomProductResponseDto>> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, filters.propertyId);

  const { items, total } = await repo.listRoomProductsPaginated(filters);

  return normalizePaginationResult(
    filters.page,
    filters.limit,
    total,
    items.map(toRoomProductResponseDto),
  );
};

export const createRoomProduct = async (
  userId: string,
  propertyId: string,
  input: {
    name: string;
    occupancy: number;
    hasAC: boolean;
    category: RoomProductCategory;
  },
): Promise<RoomProductResponseDto> => {
  const actor = await getActor(userId);
  await assertCanManageInventory(actor, propertyId);
  await ensurePropertyExists(propertyId);

  try {
    const product = await repo.createRoomProduct({
      property: {
        connect: {
          id: propertyId,
        },
      },
      name: input.name,
      occupancy: input.occupancy,
      hasAC: input.hasAC,
      category: input.category,
    });

    return toRoomProductResponseDto(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_PRODUCT_EXISTS",
        "Room product already exists",
      );
    }

    throw error;
  }
};

export const updateRoomProduct = async (
  userId: string,
  productId: string,
  input: {
    name?: string;
    occupancy?: number;
    hasAC?: boolean;
    category?: RoomProductCategory;
  },
): Promise<RoomProductResponseDto> => {
  const actor = await getActor(userId);
  const existingProduct = await ensureRoomProductExists(productId);
  await assertCanManageInventory(actor, existingProduct.propertyId);

  try {
    const product = await repo.updateRoomProductById(productId, {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.occupancy !== undefined && { occupancy: input.occupancy }),
      ...(input.hasAC !== undefined && { hasAC: input.hasAC }),
      ...(input.category !== undefined && { category: input.category }),
    });

    return toRoomProductResponseDto(product);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpError(
        409,
        "ROOM_PRODUCT_EXISTS",
        "Room product already exists",
      );
    }

    throw error;
  }
};
