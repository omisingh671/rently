import { prisma } from "@/db/prisma.js";
import {
  type BookingStatus,
  BookingStatus as BookingStatusValue,
  Prisma,
} from "@/generated/prisma/client.js";

const dashboardBookingRoomAssignmentInclude = {
  unit: true,
} satisfies Prisma.RoomInclude;

export const dashboardBookingInclude = {
  property: {
    include: {
      tenant: true,
    },
  },
  user: true,
  items: {
    orderBy: {
      createdAt: "asc",
    },
  },
  payments: {
    include: {
      refunds: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  refunds: {
    orderBy: {
      createdAt: "asc",
    },
  },
  refundRequests: {
    include: {
      reviewedBy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  },
  statusHistory: {
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  operationEvents: {
    include: {
      actor: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  folioCharges: {
    include: {
      createdBy: true,
      voidedBy: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  },
  coupon: true,
} satisfies Prisma.BookingInclude;

export type DashboardBookingRoomAssignmentRecord = Prisma.RoomGetPayload<{
  include: typeof dashboardBookingRoomAssignmentInclude;
}>;

export type DashboardBookingUnitAssignmentRecord = Prisma.UnitGetPayload<{
  include: { rooms: true };
}>;

export type DashboardBookingRecord = Prisma.BookingGetPayload<{
  include: typeof dashboardBookingInclude;
}>;

export type DashboardRoomBoardRoomRecord = Prisma.RoomGetPayload<{
  include: {
    unit: true;
  };
}>;

export type DashboardRoomBoardBookingItemRecord =
  Prisma.BookingItemGetPayload<{
    include: {
      booking: true;
    };
  }>;

export type DashboardRoomBoardMaintenanceRecord =
  Prisma.MaintenanceBlockGetPayload<Record<string, never>>;

interface BookingListFilters {
  page: number;
  limit: number;
  propertyId: string;
  search?: string;
  status?: BookingStatus;
}

const buildBookingWhere = (
  filters: Omit<BookingListFilters, "page" | "limit">,
) =>
  ({
    propertyId: filters.propertyId,
    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.search !== undefined && {
      OR: [
        { bookingRef: { contains: filters.search } },
        { targetLabel: { contains: filters.search } },
        { productName: { contains: filters.search } },
        { guestNameSnapshot: { contains: filters.search } },
        { guestEmailSnapshot: { contains: filters.search } },
        { guestContactSnapshot: { contains: filters.search } },
        {
          user: {
            is: {
              OR: [
                { fullName: { contains: filters.search } },
                { email: { contains: filters.search } },
              ],
            },
          },
        },
      ],
    }),
  }) satisfies Prisma.BookingWhereInput;

export const listRoomBoardRooms = (propertyId: string) =>
  prisma.room.findMany({
    where: {
      unit: {
        is: {
          propertyId,
        },
      },
    },
    include: {
      unit: true,
    },
    orderBy: [
      { unit: { floor: "asc" } },
      { unit: { unitNumber: "asc" } },
      { number: "asc" },
    ],
  });

export const listRoomBoardBookingItems = (
  propertyId: string,
  from: Date,
  to: Date,
) =>
  prisma.bookingItem.findMany({
    where: {
      booking: {
        propertyId,
        status: {
          notIn: [
            BookingStatusValue.CANCELLED,
            BookingStatusValue.CHECKED_OUT,
            BookingStatusValue.NO_SHOW,
          ],
        },
        checkIn: { lt: to },
        checkOut: { gt: from },
      },
    },
    include: {
      booking: true,
    },
    orderBy: [
      { booking: { checkIn: "asc" } },
      { booking: { createdAt: "asc" } },
    ],
  });

export const listRoomBoardMaintenanceBlocks = (
  propertyId: string,
  from: Date,
  to: Date,
) =>
  prisma.maintenanceBlock.findMany({
    where: {
      propertyId,
      startDate: { lt: to },
      endDate: { gt: from },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
  });

export const listBookingAssignmentRoomsByIds = async (
  ids: string[],
): Promise<DashboardBookingRoomAssignmentRecord[]> => {
  if (ids.length === 0) {
    return [];
  }

  return prisma.room.findMany({
    where: { id: { in: ids } },
    include: dashboardBookingRoomAssignmentInclude,
  });
};

export const listBookingAssignmentUnitsByIds = async (
  ids: string[],
): Promise<DashboardBookingUnitAssignmentRecord[]> => {
  if (ids.length === 0) {
    return [];
  }

  return prisma.unit.findMany({
    where: { id: { in: ids } },
    include: { rooms: true },
  });
};

export const listBookingsPaginated = async (filters: BookingListFilters) => {
  const where = buildBookingWhere(filters);
  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      skip,
      take: filters.limit,
      orderBy: { createdAt: "desc" },
      include: dashboardBookingInclude,
    }),
    prisma.booking.count({ where }),
  ]);

  return { items, total };
};

export const findBookingById = (id: string) =>
  prisma.booking.findUnique({
    where: { id },
    include: dashboardBookingInclude,
  });

export const runBookingTransaction = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Booking transaction retry limit reached");
};

export const updateBookingById = (id: string, data: Prisma.BookingUpdateInput) =>
  prisma.booking.update({
    where: { id },
    data,
    include: dashboardBookingInclude,
  });

export const findRefundByIdempotencyKey = (idempotencyKey: string) =>
  prisma.paymentRefund.findUnique({
    where: { idempotencyKey },
  });

export const createPaymentRefundForBooking = (
  data: Prisma.PaymentRefundCreateInput,
  bookingPaymentStatus: Prisma.BookingUpdateInput["paymentStatus"],
  refundRequestUpdate?: {
    id: string;
    data: Prisma.BookingRefundRequestUpdateInput;
  },
) =>
  prisma.$transaction(async (tx) => {
    const refund = await tx.paymentRefund.create({ data });

    if (refundRequestUpdate !== undefined) {
      await tx.bookingRefundRequest.update({
        where: { id: refundRequestUpdate.id },
        data: refundRequestUpdate.data,
      });
    }

    if (bookingPaymentStatus !== undefined) {
      await tx.booking.update({
        where: { id: refund.bookingId },
        data: {
          paymentStatus: bookingPaymentStatus,
        },
      });
    }

    return tx.booking.findUniqueOrThrow({
      where: { id: refund.bookingId },
      include: dashboardBookingInclude,
    });
  });

export const createBookingRefundRequest = (
  data: Prisma.BookingRefundRequestCreateInput,
) =>
  prisma.bookingRefundRequest.create({
    data,
  });

export const findRefundRequestById = (id: string) =>
  prisma.bookingRefundRequest.findUnique({
    where: { id },
  });

export const updateRefundRequestById = (
  id: string,
  data: Prisma.BookingRefundRequestUpdateInput,
) =>
  prisma.bookingRefundRequest.update({
    where: { id },
    data,
  });

export const hasOverlappingRoomBooking = (input: {
  roomId: string;
  unitId: string;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId: string;
}) =>
  prisma.bookingItem
    .count({
      where: {
        OR: [
          { targetType: "ROOM", roomId: input.roomId },
          { targetType: "UNIT", unitId: input.unitId },
        ],
        booking: {
          id: { not: input.excludeBookingId },
          status: {
            notIn: [
              BookingStatusValue.CANCELLED,
              BookingStatusValue.CHECKED_OUT,
              BookingStatusValue.NO_SHOW,
            ],
          },
          checkIn: { lt: input.checkOut },
          checkOut: { gt: input.checkIn },
        },
      },
    })
    .then((count) => count > 0);

export const hasOverlappingRoomMaintenance = (input: {
  propertyId: string;
  roomId: string;
  unitId: string;
  checkIn: Date;
  checkOut: Date;
}) =>
  prisma.maintenanceBlock
    .count({
      where: {
        propertyId: input.propertyId,
        startDate: { lt: input.checkOut },
        endDate: { gt: input.checkIn },
        OR: [
          { targetType: "PROPERTY" },
          { targetType: "UNIT", unitId: input.unitId },
          { targetType: "ROOM", roomId: input.roomId },
        ],
      },
    })
    .then((count) => count > 0);

export const updateBookingLifecycleById = (
  id: string,
  data: Prisma.BookingUpdateInput,
  history?: Prisma.BookingStatusHistoryCreateInput,
  assignments?: Array<{
    itemId: string;
    data: Prisma.BookingItemUpdateInput;
  }>,
) =>
  prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id },
      data,
    });

    if (assignments !== undefined) {
      for (const assignment of assignments) {
        await tx.bookingItem.update({
          where: { id: assignment.itemId },
          data: assignment.data,
        });
      }
    }

    if (history !== undefined) {
      await tx.bookingStatusHistory.create({
        data: history,
      });
    }

    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: dashboardBookingInclude,
    });
  });

export const releaseInventoryLocksByBooking = (
  bookingId: string,
  releasedAt: Date,
) =>
  prisma.inventoryLock.updateMany({
    where: {
      bookingId,
      releasedAt: null,
    },
    data: {
      releasedAt,
    },
  });
