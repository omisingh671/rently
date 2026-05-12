import { z } from "zod";
import { PropertyStatus } from "@/generated/prisma/enums.js";

export const PropertyStatusSchema = z.nativeEnum(PropertyStatus);

export const createPropertySchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  status: PropertyStatusSchema.optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const updatePropertySchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  status: PropertyStatusSchema.optional(),
  isActive: z.boolean().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});
