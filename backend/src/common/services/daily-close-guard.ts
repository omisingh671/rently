import { HttpError } from "@/common/errors/http-error.js";
import { getBusinessDateValue } from "@/common/utils/business-date.js";
import { prisma } from "@/db/prisma.js";
import type { Prisma } from "@/generated/prisma/client.js";

type DatabaseClient = typeof prisma | Prisma.TransactionClient;

export const assertPropertyBusinessDateOpen = async (
  propertyId: string,
  options: {
    at?: Date;
    tx?: Prisma.TransactionClient;
    operation?: string;
  } = {},
) => {
  const db: DatabaseClient = options.tx ?? prisma;
  const property = await db.property.findUnique({
    where: { id: propertyId },
    select: { tenant: { select: { timezone: true } } },
  });
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  const businessDate = getBusinessDateValue(
    options.at ?? new Date(),
    property.tenant.timezone,
  );
  const closed = await db.propertyDailyClose.findUnique({
    where: {
      propertyId_businessDate: {
        propertyId,
        businessDate: new Date(`${businessDate}T00:00:00.000Z`),
      },
    },
    select: { id: true },
  });
  if (closed) {
    throw new HttpError(
      409,
      "BUSINESS_DATE_CLOSED",
      `${options.operation ?? "Operational posting"} is closed for ${businessDate}`,
    );
  }

  return businessDate;
};
