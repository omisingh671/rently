import { z } from "zod";
import {
  PropertyClosureStatus,
  PropertyClosureType,
} from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});

export const closureIdParamsSchema = z.object({
  id: idSchema,
});

export const listPropertyClosuresQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().min(1).optional(),
  type: z.nativeEnum(PropertyClosureType).optional(),
  status: z.nativeEnum(PropertyClosureStatus).optional(),
});

export const createPropertyClosureSchema = z
  .object({
    type: z.nativeEnum(PropertyClosureType),
    reason: z.string().trim().min(3).max(500),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date cannot be before start date",
    path: ["endDate"],
  });

export const cancelPropertyClosureSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
