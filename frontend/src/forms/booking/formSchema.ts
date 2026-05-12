import { z } from "zod";

export const BookingFormSchema = z
  .object({
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
