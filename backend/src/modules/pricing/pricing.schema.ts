import { z } from "zod";
import { PricingTier, RateType } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

const basePaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

const optionalTargetSchema = z
  .object({
    unitId: idSchema.nullable().optional(),
    roomId: idSchema.nullable().optional(),
  })
  .refine((data) => !(data.unitId && data.roomId), {
    message: "Use either unitId or roomId, not both",
  });

export const listRoomPricingQuerySchema = basePaginationQuerySchema.extend({
  productId: idSchema.optional(),
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
});

export const createRoomPricingSchema = optionalTargetSchema.extend({
  productId: idSchema,
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
  taxInclusive: z.boolean().optional(),
  price: z.number().positive(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
}).superRefine((data, ctx) => {
  if (data.maxNights !== undefined && data.minNights !== undefined) {
    if (data.maxNights < data.minNights) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxNights"],
        message: "maxNights must be greater than or equal to minNights",
      });
    }
  }

  if (data.validTo !== undefined && data.validTo < data.validFrom) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validTo"],
      message: "validTo must be on or after validFrom",
    });
  }
});

export const updateRoomPricingSchema = optionalTargetSchema.extend({
  productId: idSchema.optional(),
  rateType: z.nativeEnum(RateType).optional(),
  pricingTier: z.nativeEnum(PricingTier).optional(),
  minNights: z.number().int().min(1).optional(),
  maxNights: z.number().int().min(1).optional(),
  taxInclusive: z.boolean().optional(),
  price: z.number().positive().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const idParamsSchema = z.object({
  id: idSchema,
});

export const propertyIdParamsSchema = z.object({
  propertyId: idSchema,
});
