import { z } from "zod";
import { PropertyStatus } from "@/generated/prisma/enums.js";

export const PropertyStatusSchema = z.nativeEnum(PropertyStatus);

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

const nullableOptionalString = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

const coordinateSchema = z
  .union([z.coerce.number().min(-180).max(180), z.literal(""), z.null()])
  .transform((value) => (value === "" ? null : value))
  .optional();

export const createPropertySchema = z.object({
  tenantId: z.string().uuid(),
  slug: slugSchema.optional(),
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  supportEmail: nullableOptionalString(190),
  supportPhone: nullableOptionalString(40),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
  status: PropertyStatusSchema.optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});

export const updatePropertySchema = z.object({
  tenantId: z.never().optional(),
  slug: slugSchema.optional(),
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  supportEmail: nullableOptionalString(190),
  supportPhone: nullableOptionalString(40),
  latitude: coordinateSchema,
  longitude: coordinateSchema,
  status: PropertyStatusSchema.optional(),
  isActive: z.boolean().optional(),
  amenityIds: z.array(z.string().uuid()).optional(),
});
