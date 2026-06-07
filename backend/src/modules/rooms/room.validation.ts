import { z } from "zod";
import { RoomStatus } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .optional();

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

export const listRoomsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const createRoomSchema = z.object({
  unitId: idSchema,
  name: z.string().trim().min(1).max(120),
  number: z.string().trim().min(1).max(50),
  hasAC: z.boolean().optional(),
  maxOccupancy: z.number().int().min(1).max(10).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  amenityIds: z.array(idSchema).optional(),
});

export const updateRoomSchema = z
  .object({
    unitId: idSchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    number: z.string().trim().min(1).max(50).optional(),
    hasAC: z.boolean().optional(),
    maxOccupancy: z.number().int().min(1).max(10).optional(),
    status: z.nativeEnum(RoomStatus).optional(),
    isActive: z.boolean().optional(),
    amenityIds: z.array(idSchema).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
