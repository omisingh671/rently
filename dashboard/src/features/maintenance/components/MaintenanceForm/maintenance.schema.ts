import { z } from "zod";

export const maintenanceSchema = z
  .object({
    propertyId: z.string().min(1, "Property is required"),
    targetType: z.enum(["PROPERTY", "UNIT", "ROOM"]),
    unitId: z.string().optional(),
    roomId: z.string().optional(),
    reason: z.string().trim().max(500).optional(),
    status: z
      .enum(["SCHEDULED", "IN_PROGRESS", "RESOLVED", "CANCELLED"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]),
    resolutionNote: z.string().trim().max(1000).optional(),
    emergencyOverride: z.boolean(),
    emergencyReason: z.string().trim().max(1000).optional(),
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
        message: "End date cannot be before start date",
      });
    }

    if (data.emergencyOverride && !data.emergencyReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emergencyReason"],
        message: "Emergency override reason is required",
      });
    }

    if (data.status === "RESOLVED" && !data.resolutionNote?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["resolutionNote"],
        message: "Resolution note is required",
      });
    }
  });

export type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;
