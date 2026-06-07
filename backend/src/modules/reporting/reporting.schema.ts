import { z } from "zod";

export const getAnalyticsQuerySchema = z.object({
  startDate: z.string().transform((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid start date");
    }
    return d;
  }),
  endDate: z.string().transform((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      throw new Error("Invalid end date");
    }
    return d;
  }),
  propertyId: z.string().uuid().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be greater than or equal to start date",
  path: ["endDate"],
});
