import { prisma } from "@/db/prisma.js";
import {
  Prisma,
  type BookingStatus,
  type LeadStatus,
} from "@/generated/prisma/client.js";

const dailyCloseInclude = {
  closedBy: { select: { fullName: true } },
} satisfies Prisma.PropertyDailyCloseInclude;

export type PropertyDailyCloseRecord = Prisma.PropertyDailyCloseGetPayload<{
  include: typeof dailyCloseInclude;
}>;

export const findDailyClose = (propertyId: string, businessDate: Date) =>
  prisma.propertyDailyClose.findUnique({
    where: { propertyId_businessDate: { propertyId, businessDate } },
    include: dailyCloseInclude,
  });

export const listDailyCloses = (
  propertyId: string,
  startDate: Date,
  endDate: Date,
) =>
  prisma.propertyDailyClose.findMany({
    where: { propertyId, businessDate: { gte: startDate, lte: endDate } },
    orderBy: { businessDate: "desc" },
    include: dailyCloseInclude,
  });

export const createDailyClose = (data: Prisma.PropertyDailyCloseCreateInput) =>
  prisma.propertyDailyClose.create({ data, include: dailyCloseInclude });

export const listUnresolvedArrivalsThrough = (
  propertyId: string,
  businessDateEnd: Date,
) =>
  prisma.booking.findMany({
    where: {
      propertyId,
      status: "CONFIRMED",
      checkIn: { lte: businessDateEnd },
    },
    select: { id: true, bookingRef: true, checkIn: true },
    orderBy: { checkIn: "asc" },
  });

export const listPropertySummaries = (propertyIds?: string[]) =>
  prisma.property.findMany({
    where: {
      ...(propertyIds !== undefined && {
        id: { in: propertyIds },
      }),
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      tenantId: true,
      name: true,
      city: true,
      state: true,
      tenant: {
        select: {
          name: true,
          timezone: true,
        },
      },
    },
  });

export const countAmenities = () => prisma.amenity.count();

export const countUnits = (propertyIds?: string[]) =>
  prisma.unit.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countRooms = (propertyIds?: string[]) =>
  prisma.room.count({
    where: {
      ...(propertyIds !== undefined && {
        unit: {
          is: {
            propertyId: { in: propertyIds },
          },
        },
      }),
    },
  });

export const countMaintenanceBlocks = (propertyIds?: string[]) =>
  prisma.maintenanceBlock.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countRoomProducts = (propertyIds?: string[]) =>
  prisma.roomProduct.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countRoomPricing = (propertyIds?: string[]) =>
  prisma.roomPricing.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countTaxes = (propertyIds?: string[]) =>
  prisma.tax.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
    },
  });

export const countBookings = (
  propertyIds?: string[],
  statuses?: BookingStatus[],
) =>
  prisma.booking.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const countEnquiries = (
  propertyIds?: string[],
  statuses?: LeadStatus[],
) =>
  prisma.enquiry.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const countQuotes = (
  propertyIds?: string[],
  statuses?: LeadStatus[],
) =>
  prisma.quoteRequest.count({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      ...(statuses !== undefined && {
        status: { in: statuses },
      }),
    },
  });

export const getBookingsOverlapping = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.booking.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      checkIn: { lt: endDate },
      checkOut: { gt: startDate },
      status: {
        notIn: ["CANCELLED", "NO_SHOW"],
      },
    },
    include: {
      items: true,
      roomAllocations: true,
      user: {
        select: {
          createdByUserId: true,
        },
      },
    },
  });

export const getBookingsCreatedInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.booking.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: {
        select: {
          createdByUserId: true,
        },
      },
    },
  });

export const getPaymentsInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.payment.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      status: "SUCCEEDED",
      paidAt: { gte: startDate, lte: endDate },
    },
  });

export const getRefundsInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.paymentRefund.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      status: "SUCCEEDED",
      processedAt: { gte: startDate, lte: endDate },
    },
  });

export const getEnquiriesInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.enquiry.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      createdAt: { gte: startDate, lte: endDate },
    },
  });

export const getQuotesInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.quoteRequest.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

export const getMaintenanceOverlapping = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.maintenanceBlock.findMany({
    where: {
      ...(propertyIds !== undefined && {
        propertyId: { in: propertyIds },
      }),
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
  });

export const getStatusHistoryInRange = (
  startDate: Date,
  endDate: Date,
  propertyIds?: string[],
) =>
  prisma.bookingStatusHistory.findMany({
    where: {
      booking: {
        ...(propertyIds !== undefined && {
          propertyId: { in: propertyIds },
        }),
      },
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      booking: true,
      actor: true,
    },
  });

export const getAllRoomsWithProperties = (propertyIds?: string[]) =>
  prisma.room.findMany({
    where: {
      isActive: true,
      unit: {
        isActive: true,
        ...(propertyIds !== undefined && {
          propertyId: { in: propertyIds },
        }),
      },
    },
    include: {
      unit: {
        include: {
          property: true,
        },
      },
    },
  });

export const getOperationalUsersByIds = (userIds: string[]) =>
  prisma.user.findMany({
    where: {
      id: { in: userIds },
      role: {
        in: [
          "SUPER_ADMIN",
          "ADMIN",
          "MANAGER",
          "FRONT_DESK",
          "ACCOUNTANT",
        ],
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
    },
  });
