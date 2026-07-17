import { z } from "zod";

const reportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const getAnalyticsQuerySchema = z.object({
  startDate: reportDateSchema.transform((value) =>
    new Date(`${value}T00:00:00.000Z`),
  ),
  endDate: reportDateSchema.transform((value) =>
    new Date(`${value}T23:59:59.999Z`),
  ),
  propertyId: z.string().uuid().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be greater than or equal to start date",
  path: ["endDate"],
}).refine(
  (data) => data.endDate.getTime() - data.startDate.getTime() <= 366 * 86_400_000,
  {
    message: "Report date range cannot exceed 366 days",
    path: ["endDate"],
  },
);
