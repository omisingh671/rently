import { z } from "zod";

export const BookingFormSchema = z
  .object({
    name: z.string().min(1, { message: "Name is required" }),
    email: z
      .string()
      .min(1, { message: "Email is required" })
      .email({ message: "Enter a valid email address" }),
    countryCode: z.string().min(1, { message: "Country is required" }),
    contactNumber: z
      .string()
      .min(6, { message: "Too short" })
      .max(15, { message: "Too long" })
      .regex(/^[0-9]+$/, { message: "Only digits allowed" }),
    checkIn: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "Invalid check-in date",
    }),
    checkOut: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: "Invalid check-out date",
    }),
    guests: z.coerce
      .number()
      .int({ message: "Guests must be an integer" })
      .min(1, { message: "At least 1 guest is required" }),
    occupancyType: z.enum(["single", "double"], {
      message: "Select occupancy type",
    }),
    source: z.string().optional(),
    campaign: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const inTs = Date.parse(data.checkIn);
    const outTs = Date.parse(data.checkOut);

    if (!Number.isNaN(inTs) && !Number.isNaN(outTs) && outTs <= inTs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Check-out must be after check-in",
        path: ["checkOut"],
      });
    }
  });

export type BookingFormValues = z.input<typeof BookingFormSchema>;
export type BookingFormParsedValues = z.output<typeof BookingFormSchema>;

export default BookingFormSchema;
