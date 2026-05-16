import { z } from "zod";

export const propertyFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  isActive: z.enum(["true", "false"]).optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
