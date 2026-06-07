import { z } from "zod";
import { UserRole } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");


const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const listSessionsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  userId: idSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.enum(["active", "expired"]).optional(),
});
