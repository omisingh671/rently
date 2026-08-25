import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const accountingQuerySchema = z
  .object({
    propertyId: z.string().uuid().optional(),
    startDate: date,
    endDate: date,
    sourceType: z.string().trim().min(1).max(64).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be greater than or equal to start date",
    path: ["endDate"],
  })
  .refine(
    (value) =>
      new Date(`${value.endDate}T00:00:00.000Z`).getTime() -
        new Date(`${value.startDate}T00:00:00.000Z`).getTime() <=
      366 * 86_400_000,
    { message: "Accounting range cannot exceed 367 days", path: ["endDate"] },
  );

export const journalParamsSchema = z.object({ id: z.string().uuid() });
