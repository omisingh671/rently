import { z } from "zod";
import {
  TaxCalculationMode,
  TaxCategory,
  TaxDiscountTreatment,
  TaxScope,
  TaxTargetType,
  TaxType,
} from "@/generated/prisma/enums.js";

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

export const listTaxesQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  taxType: z.nativeEnum(TaxType).optional(),
  category: z.nativeEnum(TaxCategory).optional(),
  scope: z.nativeEnum(TaxScope).optional(),
  isActive: optionalBooleanQuerySchema,
});

export const createTaxSchema = z.object({
  name: z.string().trim().min(1).max(120),
  rate: z.number().nonnegative(),
  taxType: z.nativeEnum(TaxType).optional(),
  category: z.nativeEnum(TaxCategory).optional(),
  scope: z.nativeEnum(TaxScope).optional(),
  targetType: z.nativeEnum(TaxTargetType).optional(),
  calculationMode: z.nativeEnum(TaxCalculationMode).optional(),
  discountTreatment: z.nativeEnum(TaxDiscountTreatment).optional(),
  minTariff: z.number().nonnegative().nullable().optional(),
  maxTariff: z.number().positive().nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validTo: z.coerce.date().nullable().optional(),
  priority: z.number().int().optional(),
  appliesTo: z.string().trim().min(1).max(120).optional(),
  isRefundable: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.calculationMode === TaxCalculationMode.FLAT) {
    if (data.minTariff !== undefined && data.minTariff !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minTariff"],
        message: "minTariff is not used for flat tax rules",
      });
    }

    if (data.maxTariff !== undefined && data.maxTariff !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxTariff"],
        message: "maxTariff is not used for flat tax rules",
      });
    }
  }

  if (
    data.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
    (data.minTariff === undefined || data.minTariff === null)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minTariff"],
      message: "minTariff is required for slab tax rules",
    });
  }

  if (
    data.minTariff !== undefined &&
    data.minTariff !== null &&
    data.maxTariff !== undefined &&
    data.maxTariff !== null &&
    data.maxTariff <= data.minTariff
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxTariff"],
      message: "maxTariff must be greater than minTariff",
    });
  }

  if (
    data.validFrom !== undefined &&
    data.validFrom !== null &&
    data.validTo !== undefined &&
    data.validTo !== null &&
    data.validTo < data.validFrom
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["validTo"],
      message: "validTo must be on or after validFrom",
    });
  }
});

export const updateTaxSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    rate: z.number().nonnegative().optional(),
    taxType: z.nativeEnum(TaxType).optional(),
    category: z.nativeEnum(TaxCategory).optional(),
    scope: z.nativeEnum(TaxScope).optional(),
    targetType: z.nativeEnum(TaxTargetType).optional(),
    calculationMode: z.nativeEnum(TaxCalculationMode).optional(),
    discountTreatment: z.nativeEnum(TaxDiscountTreatment).optional(),
    minTariff: z.number().nonnegative().nullable().optional(),
    maxTariff: z.number().positive().nullable().optional(),
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    priority: z.number().int().optional(),
    appliesTo: z.string().trim().min(1).max(120).optional(),
    isRefundable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.calculationMode === TaxCalculationMode.FLAT) {
      if (data.minTariff !== undefined && data.minTariff !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["minTariff"],
          message: "minTariff is not used for flat tax rules",
        });
      }

      if (data.maxTariff !== undefined && data.maxTariff !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxTariff"],
          message: "maxTariff is not used for flat tax rules",
        });
      }
    }

    if (
      data.calculationMode === TaxCalculationMode.SLAB_PER_ITEM_NIGHTLY_TARIFF &&
      data.minTariff === null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minTariff"],
        message: "minTariff is required for slab tax rules",
      });
    }

    if (
      data.minTariff !== undefined &&
      data.minTariff !== null &&
      data.maxTariff !== undefined &&
      data.maxTariff !== null &&
      data.maxTariff <= data.minTariff
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxTariff"],
        message: "maxTariff must be greater than minTariff",
      });
    }

    if (
      data.validFrom !== undefined &&
      data.validFrom !== null &&
      data.validTo !== undefined &&
      data.validTo !== null &&
      data.validTo < data.validFrom
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validTo"],
        message: "validTo must be on or after validFrom",
      });
    }
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
