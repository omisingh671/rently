import { z } from "zod";
import { ComfortOption } from "@/generated/prisma/enums.js";

const businessTimezoneOffsetMinutes = 330;

const toBusinessDate = (value: unknown) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`);
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return date;
  }

  const localDate = new Date(
    date.getTime() + businessTimezoneOffsetMinutes * 60 * 1000,
  );

  return new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
    ),
  );
};

const isoDateSchema = z.preprocess(toBusinessDate, z.date());

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const checkAvailabilitySchema = z
  .object({
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(20),
    comfortOption: z.nativeEnum(ComfortOption),
  })
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Check-out must be after check-in",
    path: ["checkOut"],
  });

export const createBookingSchema = z
  .object({
    bookingType: z.enum(["SINGLE_TARGET", "MULTI_ROOM"]).default("SINGLE_TARGET"),
    bookingOptionId: z.string().min(16).optional(),
    spaceId: z.string().uuid().optional(),
    spaceIds: z.array(z.string().uuid()).optional(),
    from: isoDateSchema,
    to: isoDateSchema,
    guests: z.coerce.number().int().min(1).max(20),
    comfortOption: z.nativeEnum(ComfortOption),
  })
  .refine((data) => data.to > data.from, {
    message: "Check-out must be after check-in",
    path: ["to"],
  })
  .superRefine((data, ctx) => {
    if (data.bookingOptionId) {
      return;
    }

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
