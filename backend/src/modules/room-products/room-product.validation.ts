import { z } from "zod";
import { RoomProductCategory } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

export const listRoomProductsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  category: z.nativeEnum(RoomProductCategory).optional(),
});

export const createRoomProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  occupancy: z.number().int().min(1).max(20),
  hasAC: z.boolean(),
  category: z.nativeEnum(RoomProductCategory),
});

export const updateRoomProductSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    occupancy: z.number().int().min(1).max(20).optional(),
    hasAC: z.boolean().optional(),
    category: z.nativeEnum(RoomProductCategory).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
