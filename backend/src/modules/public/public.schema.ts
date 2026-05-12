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
    occupancyType: z.enum(["single", "double", "unit", "multi_room"]),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const createBookingSchema = z
  .object({
    bookingType: z.enum(["SINGLE_TARGET", "MULTI_ROOM"]).default("SINGLE_TARGET"),
    spaceId: z.string().uuid().optional(),
    spaceIds: z.array(z.string().uuid()).optional(),
    from: isoDateSchema,
    to: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(20),
  })
  .refine((data) => data.to > data.from, {
    message: "Check-out must be after check-in",
    path: ["to"],
  })
  .superRefine((data, ctx) => {
    if (data.bookingType === "MULTI_ROOM") {
      if (!data.spaceIds || data.spaceIds.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "At least two spaces are required for a multi-room booking",
          path: ["spaceIds"],
        });
      }
      return;
    }

    if (!data.spaceId) {
      ctx.addIssue({
        code: "custom",
        message: "spaceId is required",
        path: ["spaceId"],
      });
    }
  });

export const cancelBookingSchema = z.object({
  reason: z.string().trim().min(1).max(1000).optional(),
});

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
