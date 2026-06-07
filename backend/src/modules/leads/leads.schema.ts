import { z } from "zod";
import { LeadStatus } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const listLeadsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.string().trim().min(1).max(80).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
});
