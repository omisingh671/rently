import { z } from "zod";

export const unitSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  unitNumber: z.string().min(1, "Unit number is required"),
  floor: z.number().int().min(0),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  isActive: z.boolean(),

  amenityIds: z.array(z.string().uuid()).optional(),
});

export type UnitFormValues = z.infer<typeof unitSchema>;
