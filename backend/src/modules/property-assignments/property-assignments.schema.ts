import { z } from "zod";
import { PropertyAssignmentRole } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const listAssignmentsQuerySchema = basePaginationQuerySchema.extend({
  propertyId: idSchema.optional(),
  role: z.nativeEnum(PropertyAssignmentRole).optional(),
});

export const createAssignmentSchema = z.object({
  propertyId: idSchema,
  userId: idSchema,
  role: z.nativeEnum(PropertyAssignmentRole),
});
