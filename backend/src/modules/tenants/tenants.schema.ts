import { z } from "zod";
import { TenantStatus } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const nullableOptionalString = (max: number) =>
  z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value))
    .optional();

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");
const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug");

export const listTenantsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(TenantStatus).optional(),
});

export const createTenantSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  primaryDomain: nullableOptionalString(190),
  status: z.nativeEnum(TenantStatus).optional(),
  brandName: z.string().trim().min(1).max(120),
  logoUrl: nullableOptionalString(500),
  primaryColor: colorSchema.optional(),
  secondaryColor: colorSchema.optional(),
  supportEmail: nullableOptionalString(190),
  supportPhone: nullableOptionalString(40),
  defaultCurrency: z.string().trim().min(3).max(3).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
});

export const updateTenantSchema = createTenantSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const idParamsSchema = z.object({
  id: idSchema,
});
