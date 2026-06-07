import { z } from "zod";
import { MaintenanceTargetType } from "@/generated/prisma/enums.js";

const idSchema = z.string().min(1, "ID is required");

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

export const listMaintenanceQuerySchema = basePaginationQuerySchema.extend({
  search: z.string().trim().min(1).optional(),
  targetType: z.nativeEnum(MaintenanceTargetType).optional(),
});

export const createMaintenanceSchema = z
  .object({
    targetType: z.nativeEnum(MaintenanceTargetType),
    unitId: idSchema.optional(),
    roomId: idSchema.optional(),
    reason: z.string().trim().max(500).optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate cannot be before startDate",
      });
    }

    if (data.targetType === MaintenanceTargetType.UNIT && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "unitId is required for unit maintenance blocks",
      });
    }

    if (data.targetType === MaintenanceTargetType.ROOM && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomId"],
        message: "roomId is required for room maintenance blocks",
      });
    }
  });

export const updateMaintenanceSchema = z
  .object({
    targetType: z.nativeEnum(MaintenanceTargetType).optional(),
    unitId: idSchema.optional(),
    roomId: idSchema.optional(),
    reason: z.string().trim().max(500).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });
