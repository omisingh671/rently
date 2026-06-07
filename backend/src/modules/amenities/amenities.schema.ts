import { z } from "zod";
import { optionalStringFromForm } from "@/common/validation/strings.js";

const idSchema = z.string().min(1, "ID is required");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const optionalBooleanQuerySchema = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .optional();

export const createAmenitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  // Optional icon from HTML form
  icon: optionalStringFromForm(50),
});

export const updateAmenitySchema = z.object({
  name: z.string().min(2).optional(),

  // Optional icon update
  icon: optionalStringFromForm(50),

  isActive: z.boolean().optional(),
});

export const listAmenitiesQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const replacePropertyAmenityAssignmentsSchema = z.object({
  amenityIds: z.array(idSchema),
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});
