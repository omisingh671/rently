import { z } from "zod";
import { DiscountType } from "@/generated/prisma/enums.js";

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

export const listCouponsQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(50),
    name: z.string().trim().min(1).max(120),
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.number().positive(),
    maxUses: z.number().int().positive().optional(),
    minNights: z.number().int().positive().optional(),
    minAmount: z.number().positive().optional(),
    validFrom: z.coerce.date(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    oncePerUser: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.validTo !== undefined && data.validTo < data.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  });

export const updateCouponSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    discountType: z.nativeEnum(DiscountType).optional(),
    discountValue: z.number().positive().optional(),
    maxUses: z.number().int().positive().optional(),
    minNights: z.number().int().positive().optional(),
    minAmount: z.number().positive().optional(),
    validFrom: z.coerce.date().optional(),
    validTo: z.coerce.date().optional(),
    isActive: z.boolean().optional(),
    oncePerUser: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
