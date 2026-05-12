import { z } from "zod";

export const maintenanceSchema = z
  .object({
    propertyId: z.string().min(1, "Property is required"),
    targetType: z.enum(["PROPERTY", "UNIT", "ROOM"]),
    unitId: z.string().optional(),
    roomId: z.string().optional(),
    reason: z.string().trim().max(500).optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === "UNIT" && !data.unitId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitId"],
        message: "Unit is required",
      });
    }

    if (data.targetType === "ROOM" && !data.roomId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roomId"],
        message: "Room is required",
      });
    }

    if (new Date(data.endDate) < new Date(data.startDate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date must be on or after start date",
      });
    }
  });

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
