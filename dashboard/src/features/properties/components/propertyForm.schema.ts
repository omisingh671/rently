import { z } from "zod";

export const propertyFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required"),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters")
    .max(80, "Slug must be 80 characters or fewer")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  supportEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .or(z.literal(""))
    .optional(),
  supportPhone: z.string().trim().max(40, "Phone is too long").optional(),
  latitude: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), {
      message: "Latitude must be a number",
    })
    .optional(),
  longitude: z
    .string()
    .trim()
    .refine((value) => value === "" || !Number.isNaN(Number(value)), {
      message: "Longitude must be a number",
    })
    .optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "MAINTENANCE"]),
  isActive: z.enum(["true", "false"]).optional(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
