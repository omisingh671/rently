import { z } from "zod";
import { UnitStatus } from "@/generated/prisma/enums.js";

export const createUnitSchema = z.object({
  unitNumber: z.string().trim().min(1).max(50),
  floor: z.coerce.number().int(),
  status: z.nativeEnum(UnitStatus).optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const updateUnitSchema = z.object({
  unitNumber: z.string().trim().min(1).max(50).optional(),
  floor: z.coerce.number().int().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  isActive: z.boolean().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const unitIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const propertyIdParamSchema = z.object({
  propertyId: z.string().uuid(),
});

export const listUnitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(UnitStatus).optional(),
  isActive: z.coerce.boolean().optional(),
});
