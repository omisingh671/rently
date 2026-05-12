import { z } from "zod";

const isoDateSchema = z.coerce.date();

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const checkAvailabilitySchema = z
  .object({
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(20),
    occupancyType: z.enum(["single", "double"]),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const createBookingSchema = z
  .object({
    spaceId: z.string().uuid(),
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((data) => data.to > data.from, {
    message: "Check-out must be after check-in",
    path: ["to"],
  });

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});

export const createEnquirySchema = z.object({
  propertyId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(190),
  contactNumber: z.string().trim().min(5).max(40),
  message: z.string().trim().min(1).max(2000),
});
