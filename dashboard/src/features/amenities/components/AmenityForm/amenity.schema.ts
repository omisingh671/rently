import { z } from "zod";

export const amenitySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  icon: z.string().optional(),
});

export type AmenityFormValues = z.infer<typeof amenitySchema>;
