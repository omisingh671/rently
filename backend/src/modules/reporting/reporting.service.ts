import {
  BookingStatus,
  LeadStatus,
  PropertyAssignmentRole,
  Prisma,
  UserRole,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import {
  getActor,
  getPropertyScope,
  type DashboardActor,
} from "@/common/services/scoping.service.js";
import { countAssignments } from "@/modules/property-assignments/property-assignments.repository.js";
import { countUsersByRole } from "@/modules/users/users.repository.js";
import * as repo from "./reporting.repository.js";
import { getBusinessDateValue } from "@/common/utils/business-date.js";
import type {
  ReportingMeDTO,
  ReportingSummaryDTO,
  ReportingUserDTO,
  DailyOccupancyDTO,
  DailyRevenueDTO,
  BookingSourceDTO,
  PropertyPerformanceDTO,
  ManagerActivityDTO,
  ReportingAnalyticsDTO,
  PropertyDailyCloseDTO,
} from "./reporting.dto.js";


function mapUser(user: DashboardActor): ReportingUserDTO {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    createdByUserId: user.createdByUserId ?? null,
    countryCode: user.countryCode ?? null,
    contactNumber: user.contactNumber ?? null,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const REPORTING_MODULES: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: [
    "dashboard",
    "tenants",
    "properties",
    "users",
    "sessions",
    "admins",
    "propertyAssignments",
  ],
  [UserRole.ADMIN]: [
    "dashboard",
    "assignedProperties",
    "amenities",
    "units",
    "rooms",
    "pricing",
    "maintenance",
    "managers",
    "bookings",
    "enquiries",
    "quotes",
  ],
  [UserRole.MANAGER]: ["dashboard", "bookings", "enquiries", "quotes"],
  [UserRole.FRONT_DESK]: ["dashboard", "bookings"],
  [UserRole.ACCOUNTANT]: ["dashboard", "bookings", "billing", "reports"],
  [UserRole.GUEST]: [],
};

const countOperationalSummary = async (propertyIds?: string[]) => {
  const [
    totalRooms,
    totalMaintenanceBlocks,
    totalRoomProducts,
    totalRoomPricing,
    totalTaxes,
    totalBookings,
    pendingBookings,
    totalEnquiries,
    openEnquiries,
    totalQuotes,
    openQuotes,
  ] = await Promise.all([
    repo.countRooms(propertyIds),
    repo.countMaintenanceBlocks(propertyIds),
    repo.countRoomProducts(propertyIds),
    repo.countRoomPricing(propertyIds),
    repo.countTaxes(propertyIds),
    repo.countBookings(propertyIds),
    repo.countBookings(propertyIds, [BookingStatus.PENDING]),
    repo.countEnquiries(propertyIds),
    repo.countEnquiries(propertyIds, [
      LeadStatus.NEW,
      LeadStatus.IN_PROGRESS,
    ]),
    repo.countQuotes(propertyIds),
    repo.countQuotes(propertyIds, [LeadStatus.NEW, LeadStatus.IN_PROGRESS]),
  ]);

  return {
    totalRooms,
    totalMaintenanceBlocks,
    totalRoomProducts,
    totalRoomPricing,
    totalTaxes,
    totalCoupons: 0,
    totalBookings,
    pendingBookings,
    totalEnquiries,
    openEnquiries,
    totalQuotes,
    openQuotes,
  };
};

export const getReportingContext = async (
  userId: string,
): Promise<ReportingMeDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  const properties = await repo.listPropertySummaries(
    scope.isGlobal ? undefined : scope.propertyIds,
  );

  return {
    user: mapUser(actor),
    properties: properties.map((property) => ({
      id: property.id,
      name: property.name,
      city: property.city,
      state: property.state,
      tenantId: property.tenantId,
      tenantName: property.tenant.name,
    })),
    modules: REPORTING_MODULES[actor.role],
  };
};

export const getReportingSummary = async (
  userId: string,
): Promise<ReportingSummaryDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  const scopedPropertyIds = scope.isGlobal ? undefined : scope.propertyIds;

  if (actor.role === UserRole.SUPER_ADMIN) {
    const [
      totalProperties,
      totalAdmins,
      totalManagers,
      totalAmenities,
      totalUnits,
      totalAssignments,
      operationalSummary,
    ] = await Promise.all([
      repo.listPropertySummaries().then((properties) => properties.length),
      countUsersByRole(UserRole.ADMIN),
      countUsersByRole(UserRole.MANAGER),
      repo.countAmenities(),
      repo.countUnits(),
      countAssignments(),
      countOperationalSummary(),
    ]);

    return {
      totalProperties,
      totalAdmins,
      totalManagers,
      totalAmenities,
      totalUnits,
      ...operationalSummary,
      totalAssignments,
    };
  }

  if (actor.role === UserRole.ADMIN) {
    const [
      totalAmenities,
      totalUnits,
      totalManagers,
      totalAssignments,
      operationalSummary,
    ] = await Promise.all([
      repo.countAmenities(),
      repo.countUnits(scopedPropertyIds),
      countUsersByRole(UserRole.MANAGER, actor.id),
      countAssignments(scopedPropertyIds, PropertyAssignmentRole.MANAGER),
      countOperationalSummary(scopedPropertyIds),
    ]);

    return {
      totalProperties: scope.propertyIds.length,
      totalAdmins: 1,
      totalManagers,
      totalAmenities,
      totalUnits,
      ...operationalSummary,
      totalAssignments,
    };
  }

  const operationalSummary = await countOperationalSummary(scopedPropertyIds);

  return {
    totalProperties: scope.propertyIds.length,
    totalAdmins: 0,
    totalManagers: 0,
    totalAmenities: 0,
    totalUnits: 0,
    totalRooms: 0,
    totalMaintenanceBlocks: 0,
    totalRoomProducts: 0,
    totalRoomPricing: 0,
    totalTaxes: 0,
    totalCoupons: 0,
    totalBookings: operationalSummary.totalBookings,
    pendingBookings: operationalSummary.pendingBookings,
    totalEnquiries: operationalSummary.totalEnquiries,
    openEnquiries: operationalSummary.openEnquiries,
    totalQuotes: operationalSummary.totalQuotes,
    openQuotes: operationalSummary.openQuotes,
    totalAssignments: scope.propertyIds.length,
  };
};

const mapDailyClose = (
  close: repo.PropertyDailyCloseRecord,
): PropertyDailyCloseDTO => ({
  id: close.id,
  propertyId: close.propertyId,
  businessDate: close.businessDate.toISOString().slice(0, 10),
  closedByUserId: close.closedByUserId,
  closedByName: close.closedBy.fullName,
  paymentCount: close.paymentCount,
  paymentTotal: Number(close.paymentTotal),
  refundCount: close.refundCount,
  refundTotal: Number(close.refundTotal),
  netPaymentTotal: Number(close.netPaymentTotal),
  bookingsCreated: close.bookingsCreated,
  checkIns: close.checkIns,
  checkOuts: close.checkOuts,
  noShows: close.noShows,
  note: close.note,
  closedAt: close.closedAt.toISOString(),
});

export const listPropertyDailyCloses = async (
  userId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
): Promise<PropertyDailyCloseDTO[]> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  if (!scope.isGlobal && !scope.propertyIds.includes(propertyId)) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  const closes = await repo.listDailyCloses(
    propertyId,
    new Date(`${startDate}T00:00:00.000Z`),
    new Date(`${endDate}T00:00:00.000Z`),
  );
  return closes.map(mapDailyClose);
};

export const closePropertyBusinessDate = async (
  userId: string,
  propertyId: string,
  businessDate: string,
  note?: string,
): Promise<PropertyDailyCloseDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);
  if (!scope.isGlobal && !scope.propertyIds.includes(propertyId)) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }

  const [property] = await repo.listPropertySummaries([propertyId]);
  if (!property) {
    throw new HttpError(404, "PROPERTY_NOT_FOUND", "Property not found");
  }
  const currentBusinessDate = getBusinessDateValue(
    new Date(),
    property.tenant.timezone,
  );
  if (businessDate >= currentBusinessDate) {
    throw new HttpError(
      422,
      "OPEN_BUSINESS_DATE_CANNOT_BE_CLOSED",
      "Only a completed business date before today can be closed",
    );
  }

  const businessDateValue = new Date(`${businessDate}T00:00:00.000Z`);
  const existing = await repo.findDailyClose(propertyId, businessDateValue);
  if (existing) return mapDailyClose(existing);

  const businessDateEnd = new Date(`${businessDate}T23:59:59.999Z`);
  const unresolvedArrivals = await repo.listUnresolvedArrivalsThrough(
    propertyId,
    businessDateEnd,
  );
  if (unresolvedArrivals.length > 0) {
    throw new HttpError(
      409,
      "UNRESOLVED_ARRIVALS",
      "Resolve confirmed arrivals by checking in, cancelling, or marking no-show before daily close",
      {
        count: unresolvedArrivals.length,
        bookings: unresolvedArrivals.slice(0, 20).map((booking) => ({
          id: booking.id,
          reference: booking.bookingRef,
          checkIn: booking.checkIn.toISOString(),
        })),
      },
    );
  }

  const broadStart = new Date(businessDateValue.getTime() - 86_400_000);
  const broadEnd = new Date(businessDateEnd.getTime() + 86_400_000);
  const [payments, refunds, bookings, statusHistory] = await Promise.all([
    repo.getPaymentsInRange(broadStart, broadEnd, [propertyId]),
    repo.getRefundsInRange(broadStart, broadEnd, [propertyId]),
    repo.getBookingsCreatedInRange(broadStart, broadEnd, [propertyId]),
    repo.getStatusHistoryInRange(broadStart, broadEnd, [propertyId]),
  ]);
  const isBusinessDate = (date: Date) =>
    getBusinessDateValue(date, property.tenant.timezone) === businessDate;
  const dayPayments = payments.filter(
    (payment) => payment.paidAt !== null && isBusinessDate(payment.paidAt),
  );
  const dayRefunds = refunds.filter(
    (refund) => refund.processedAt !== null && isBusinessDate(refund.processedAt),
  );
  const dayBookings = bookings.filter((booking) => isBusinessDate(booking.createdAt));
  const dayStatusHistory = statusHistory.filter((history) =>
    isBusinessDate(history.createdAt),
  );
  const paymentTotal = dayPayments.reduce(
    (total, payment) => total + Number(payment.amount),
    0,
  );
  const refundTotal = dayRefunds.reduce(
    (total, refund) => total + Number(refund.amount),
    0,
  );

  try {
    return mapDailyClose(
      await repo.createDailyClose({
        property: { connect: { id: propertyId } },
        closedBy: { connect: { id: actor.id } },
        businessDate: businessDateValue,
        paymentCount: dayPayments.length,
        paymentTotal,
        refundCount: dayRefunds.length,
        refundTotal,
        netPaymentTotal: paymentTotal - refundTotal,
        bookingsCreated: dayBookings.length,
        checkIns: dayStatusHistory.filter(
          (history) => history.toStatus === "CHECKED_IN",
        ).length,
        checkOuts: dayStatusHistory.filter(
          (history) => history.toStatus === "CHECKED_OUT",
        ).length,
        noShows: dayStatusHistory.filter(
          (history) => history.toStatus === "NO_SHOW",
        ).length,
        ...(note !== undefined && { note }),
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const concurrentClose = await repo.findDailyClose(
        propertyId,
        businessDateValue,
      );
      if (concurrentClose) return mapDailyClose(concurrentClose);
    }
    throw error;
  }
};

const getDaysArray = (start: Date, end: Date): Date[] => {
  const arr: Date[] = [];
  const dt = new Date(start);
  dt.setUTCHours(0, 0, 0, 0);
  const endDt = new Date(end);
  endDt.setUTCHours(0, 0, 0, 0);
  while (dt <= endDt) {
    arr.push(new Date(dt));
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return arr;
};

const formatDateOnly = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getReportingAnalytics = async (
  userId: string,
  query: { startDate: Date; endDate: Date; propertyId?: string | undefined },
): Promise<ReportingAnalyticsDTO> => {
  const actor = await getActor(userId);
  const scope = await getPropertyScope(actor);

  if (query.propertyId) {
    if (!scope.isGlobal && !scope.propertyIds.includes(query.propertyId)) {
      throw new HttpError(403, "FORBIDDEN", "Property not in scope");
    }
  }

  const propertyIdsToQuery = query.propertyId
    ? [query.propertyId]
    : (scope.isGlobal ? undefined : scope.propertyIds);

  if (propertyIdsToQuery !== undefined && propertyIdsToQuery.length === 0) {
    return {
      occupancy: [],
      revenue: [],
      sources: [],
      conversions: {
        totalEnquiries: 0,
        convertedEnquiries: 0,
        enquiryConversionRate: 0,
        totalQuotes: 0,
        convertedQuotes: 0,
        quoteConversionRate: 0,
        totalBookings: 0,
      },
      properties: [],
      managers: [],
    };
  }

  const reportingProperties = await repo.listPropertySummaries(propertyIdsToQuery);
  const propertyTimezones = new Map(
    reportingProperties.map((property) => [property.id, property.tenant.timezone]),
  );
  const startDateValue = formatDateOnly(query.startDate);
  const endDateValue = formatDateOnly(query.endDate);
  const broadStartDate = new Date(query.startDate.getTime() - 86_400_000);
  const broadEndDate = new Date(query.endDate.getTime() + 86_400_000);
  const isEventInBusinessRange = (date: Date, propertyId: string) => {
    const timeZone = propertyTimezones.get(propertyId) ?? "UTC";
    const dateValue = getBusinessDateValue(date, timeZone);
    return dateValue >= startDateValue && dateValue <= endDateValue;
  };

  // Fetch all required data concurrently
  const [
    bookingsOverlapping,
    bookingsCreated,
    payments,
    refunds,
    enquiries,
    quotes,
    maintenance,
    statusHistory,
    rooms,
  ] = await Promise.all([
    repo.getBookingsOverlapping(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getBookingsCreatedInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getPaymentsInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getRefundsInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getEnquiriesInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getQuotesInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getMaintenanceOverlapping(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getStatusHistoryInRange(broadStartDate, broadEndDate, propertyIdsToQuery),
    repo.getAllRoomsWithProperties(propertyIdsToQuery),
  ]);

  const bookingsCreatedInBusinessRange = bookingsCreated.filter((booking) =>
    isEventInBusinessRange(booking.createdAt, booking.propertyId),
  );
  const paymentsInBusinessRange = payments.filter(
    (payment) =>
      payment.paidAt !== null &&
      isEventInBusinessRange(payment.paidAt, payment.propertyId),
  );
  const refundsInBusinessRange = refunds.filter(
    (refund) =>
      refund.processedAt !== null &&
      isEventInBusinessRange(refund.processedAt, refund.propertyId),
  );
  const enquiriesInBusinessRange = enquiries.filter((enquiry) =>
    isEventInBusinessRange(enquiry.createdAt, enquiry.propertyId),
  );
  const quotesInBusinessRange = quotes.filter((quote) =>
    isEventInBusinessRange(quote.createdAt, quote.propertyId),
  );
  const statusHistoryInBusinessRange = statusHistory.filter((history) =>
    isEventInBusinessRange(history.createdAt, history.booking.propertyId),
  );

  const operationalUserIds = new Set<string>();
  statusHistoryInBusinessRange.forEach((history) => {
    if (history.actorUserId) operationalUserIds.add(history.actorUserId);
  });
  paymentsInBusinessRange.forEach((payment) => {
    if (payment.receivedByUserId) operationalUserIds.add(payment.receivedByUserId);
  });
  const allUsers = await repo.getOperationalUsersByIds([...operationalUserIds]);

  const days = getDaysArray(query.startDate, query.endDate);
  const reportRoomIds = new Set(rooms.map((room) => room.id));
  const occupiedRoomIdsForDay = (
    dayStart: Date,
    dayEnd: Date,
    propertyId?: string,
  ) => {
    const occupiedRoomIds = new Set<string>();
    const allocationSnapshotAt = new Date(dayEnd.getTime() - 1);
    for (const booking of bookingsOverlapping) {
      if (propertyId !== undefined && booking.propertyId !== propertyId) {
        continue;
      }
      if (booking.checkIn >= dayEnd || booking.checkOut <= dayStart) {
        continue;
      }
      const activeAllocations = booking.roomAllocations.filter(
        (allocation) =>
          allocation.effectiveFrom <= allocationSnapshotAt &&
          (allocation.effectiveTo === null ||
            allocation.effectiveTo > allocationSnapshotAt),
      );
      if (activeAllocations.length > 0) {
        for (const allocation of activeAllocations) {
          if (reportRoomIds.has(allocation.roomId)) {
            occupiedRoomIds.add(allocation.roomId);
          }
        }
        continue;
      }

      const legacyRoomIds = [
        booking.roomId,
        ...booking.items.map((item) => item.roomId),
      ];
      for (const roomId of legacyRoomIds) {
        if (roomId !== null && reportRoomIds.has(roomId)) {
          occupiedRoomIds.add(roomId);
        }
      }
    }
    return occupiedRoomIds;
  };

  // 1. Calculate Daily Occupancy
  const occupancy: DailyOccupancyDTO[] = [];
  const totalRoomsCount = rooms.length;

  for (const day of days) {
    const dayStr = formatDateOnly(day);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setUTCHours(23, 59, 59, 999);

    // Maintenance rooms on this day
    const maintenanceRoomsOnDay = new Set<string>();
    for (const m of maintenance) {
      if (m.startDate < dayEnd && m.endDate > dayStart) {
        if (m.targetType === "ROOM" && m.roomId) {
          maintenanceRoomsOnDay.add(m.roomId);
        } else if (m.targetType === "UNIT" && m.unitId) {
          const unitRooms = rooms.filter((r) => r.unitId === m.unitId).map((r) => r.id);
          unitRooms.forEach((id) => maintenanceRoomsOnDay.add(id));
        } else if (m.targetType === "PROPERTY") {
          rooms.forEach((r) => maintenanceRoomsOnDay.add(r.id));
        }
      }
    }

    const availableNights = Math.max(0, totalRoomsCount - maintenanceRoomsOnDay.size);

    // Booked rooms on this day
    const occupiedNights = Array.from(
      occupiedRoomIdsForDay(dayStart, dayEnd),
    ).filter((roomId) => !maintenanceRoomsOnDay.has(roomId)).length;

    const actualOccupiedNights = Math.min(occupiedNights, availableNights);
    const occupancyRate = availableNights === 0 ? 0 : Math.round((actualOccupiedNights / availableNights) * 100);

    occupancy.push({
      date: dayStr,
      totalRooms: totalRoomsCount,
      availableNights,
      occupiedNights: actualOccupiedNights,
      occupancyRate,
    });
  }

  // 2. Calculate Daily Revenue
  const revenue: DailyRevenueDTO[] = [];
  for (const day of days) {
    const dayStr = formatDateOnly(day);
    const dayStart = new Date(day);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const dayBookings = bookingsOverlapping.filter(
      (booking) => booking.checkIn < dayEnd && booking.checkOut > dayStart,
    );

    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;

    for (const b of dayBookings) {
      const stayNights = Math.max(
        1,
        Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / 86_400_000),
      );
      subtotal += Number(b.subtotalAmount) / stayNights;
      discount += Number(b.discountAmount) / stayNights;
      tax += Number(b.taxAmount) / stayNights;
      total += Number(b.totalAmount) / stayNights;
    }

    const dayPayments = paymentsInBusinessRange.filter(
      (payment) =>
        payment.paidAt !== null &&
        getBusinessDateValue(
          payment.paidAt,
          propertyTimezones.get(payment.propertyId) ?? "UTC",
        ) === dayStr,
    );
    const paid = dayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const dayRefunds = refundsInBusinessRange.filter(
      (refund) =>
        refund.processedAt !== null &&
        getBusinessDateValue(
          refund.processedAt,
          propertyTimezones.get(refund.propertyId) ?? "UTC",
        ) === dayStr,
    );
    const refundAmt = dayRefunds.reduce((sum, r) => sum + Number(r.amount), 0);

    revenue.push({
      date: dayStr,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      refunds: Math.round(refundAmt * 100) / 100,
      netRevenue: Math.round((paid - refundAmt) * 100) / 100,
    });
  }

  // 3. Booking Source
  const sourceMap = {
    PUBLIC: { count: 0, revenue: 0 },
    WALK_IN: { count: 0, revenue: 0 },
  };

  for (const b of bookingsCreatedInBusinessRange) {
    const sourceKey = b.source;
    sourceMap[sourceKey].count++;
    sourceMap[sourceKey].revenue += Number(b.totalAmount);
  }

  const sources: BookingSourceDTO[] = [
    {
      source: "PUBLIC",
      count: sourceMap.PUBLIC.count,
      revenue: Math.round(sourceMap.PUBLIC.revenue * 100) / 100,
    },
    {
      source: "WALK_IN",
      count: sourceMap.WALK_IN.count,
      revenue: Math.round(sourceMap.WALK_IN.revenue * 100) / 100,
    },
  ];

  // 4. Enquiry & Quote Conversions
  const bookedEmails = new Set(
    bookingsCreatedInBusinessRange
      .filter((b) => ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status))
      .map((b) => b.guestEmailSnapshot.trim().toLowerCase()),
  );

  const convertedEnquiries = enquiriesInBusinessRange.filter((e) =>
    bookedEmails.has(e.email.trim().toLowerCase()),
  ).length;

  const convertedQuotes = quotesInBusinessRange.filter((q) => {
    return bookingsCreatedInBusinessRange.some(
      (b) =>
        ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status) &&
        (b.userId === q.userId || b.guestEmailSnapshot.trim().toLowerCase() === q.user?.email.trim().toLowerCase()),
    );
  }).length;

  const totalEnquiries = enquiriesInBusinessRange.length;
  const totalQuotes = quotesInBusinessRange.length;
  const enquiryConversionRate = totalEnquiries === 0 ? 0 : Math.round((convertedEnquiries / totalEnquiries) * 100);
  const quoteConversionRate = totalQuotes === 0 ? 0 : Math.round((convertedQuotes / totalQuotes) * 100);

  const conversions = {
    totalEnquiries,
    convertedEnquiries,
    enquiryConversionRate,
    totalQuotes,
    convertedQuotes,
    quoteConversionRate,
    totalBookings: bookingsCreatedInBusinessRange.length,
  };

  // 5. Property Performance
  const propertiesMap = new Map<string, { id: string; name: string }>();
  rooms.forEach((r) => {
    const prop = r.unit.property;
    if (prop) {
      propertiesMap.set(prop.id, { id: prop.id, name: prop.name });
    }
  });

  const properties: PropertyPerformanceDTO[] = [];

  for (const [propId, prop] of propertiesMap.entries()) {
    const propRooms = rooms.filter((r) => r.unit.propertyId === propId);
    const propRoomsCount = propRooms.length;

    let propAvailableNights = 0;
    let propOccupiedNights = 0;

    for (const day of days) {
      const dayStart = new Date(day);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const maintenanceRoomsOnDay = new Set<string>();
      for (const m of maintenance) {
        if (m.propertyId === propId && m.startDate < dayEnd && m.endDate > dayStart) {
          if (m.targetType === "ROOM" && m.roomId) {
            maintenanceRoomsOnDay.add(m.roomId);
          } else if (m.targetType === "UNIT" && m.unitId) {
            const unitRooms = propRooms.filter((r) => r.unitId === m.unitId).map((r) => r.id);
            unitRooms.forEach((id) => maintenanceRoomsOnDay.add(id));
          } else if (m.targetType === "PROPERTY") {
            propRooms.forEach((r) => maintenanceRoomsOnDay.add(r.id));
          }
        }
      }

      const availableOnDay = Math.max(0, propRoomsCount - maintenanceRoomsOnDay.size);
      propAvailableNights += availableOnDay;

      const occupiedOnDay = Array.from(
        occupiedRoomIdsForDay(dayStart, dayEnd, propId),
      ).filter((roomId) => !maintenanceRoomsOnDay.has(roomId)).length;
      propOccupiedNights += Math.min(occupiedOnDay, availableOnDay);
    }

    const grossRevenue = bookingsOverlapping
      .filter((booking) => booking.propertyId === propId)
      .reduce((sum, booking) => {
        const stayNights = Math.max(
          1,
          Math.ceil(
            (booking.checkOut.getTime() - booking.checkIn.getTime()) /
              86_400_000,
          ),
        );
        const recognizedNights = days.filter((day) => {
          const dayStart = new Date(day);
          dayStart.setUTCHours(0, 0, 0, 0);
          const dayEnd = new Date(day);
          dayEnd.setUTCHours(23, 59, 59, 999);
          return booking.checkIn < dayEnd && booking.checkOut > dayStart;
        }).length;
        return sum + (Number(booking.totalAmount) / stayNights) * recognizedNights;
      }, 0);

    const propPayments = paymentsInBusinessRange.filter((p) => p.propertyId === propId);
    const propRefunds = refundsInBusinessRange.filter((r) => r.propertyId === propId);
    const netRevenue = propPayments.reduce((sum, p) => sum + Number(p.amount), 0) -
                       propRefunds.reduce((sum, r) => sum + Number(r.amount), 0);

    const occupancyRate = propAvailableNights === 0 ? 0 : Math.round((propOccupiedNights / propAvailableNights) * 100);
    const adr = propOccupiedNights === 0 ? 0 : Math.round((grossRevenue / propOccupiedNights) * 100) / 100;
    const revpar = propAvailableNights === 0 ? 0 : Math.round((grossRevenue / propAvailableNights) * 100) / 100;

    properties.push({
      propertyId: propId,
      propertyName: prop.name,
      occupancyRate,
      totalRooms: propRoomsCount,
      availableNights: propAvailableNights,
      occupiedNights: propOccupiedNights,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      adr,
      revpar,
    });
  }

  // 6. Manager Activity
  const managers: ManagerActivityDTO[] = allUsers.map((u) => {
    const walkinsCreated = statusHistoryInBusinessRange.filter(
      (history) =>
        history.actorUserId === u.id &&
        history.note === "Manual walk-in booking created from dashboard",
    ).length;

    const checkInsProcessed = statusHistoryInBusinessRange.filter(
      (h) => h.toStatus === "CHECKED_IN" && h.actorUserId === u.id,
    ).length;

    const checkOutsProcessed = statusHistoryInBusinessRange.filter(
      (h) => h.toStatus === "CHECKED_OUT" && h.actorUserId === u.id,
    ).length;

    const paymentsRecorded = paymentsInBusinessRange.filter((p) => p.receivedByUserId === u.id).length;

    return {
      managerId: u.id,
      managerName: u.fullName,
      email: u.email,
      role: u.role,
      walkinsCreated,
      checkInsProcessed,
      checkOutsProcessed,
      paymentsRecorded,
    };
  });

  return {
    occupancy,
    revenue,
    sources,
    conversions,
    properties,
    managers,
  };
};
