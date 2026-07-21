import { z } from "zod";

const reportDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const reportingPropertyParamsSchema = z.object({
  propertyId: z.string().uuid(),
});

export const createDailyCloseSchema = z.object({
  businessDate: reportDateSchema,
  note: z.string().trim().min(1).max(500).optional(),
});

export const listDailyClosesQuerySchema = z
  .object({
    startDate: reportDateSchema,
    endDate: reportDateSchema,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"],
  })
  .refine(
    (data) =>
      new Date(`${data.endDate}T00:00:00.000Z`).getTime() -
        new Date(`${data.startDate}T00:00:00.000Z`).getTime() <=
      92 * 86_400_000,
    {
      message: "Daily close range cannot exceed 93 days",
      path: ["endDate"],
    },
  );

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
  (data) => data.endDate.getTime() - data.startDate.getTime() < 93 * 86_400_000,
  {
    message: "Report date range cannot exceed 93 days",
    path: ["endDate"],
  },
);
