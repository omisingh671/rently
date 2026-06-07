import { z } from "zod";

export const publicEnquirySourceSchema = z.enum([
  "PUBLIC_WEBSITE",
  "PUBLIC_QUOTE_REQUEST",
]);

export const createEnquirySchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(190),
  contactNumber: z.string().trim().min(5).max(40),
  message: z.string().trim().min(1).max(2000),
  source: publicEnquirySourceSchema.optional(),
});
