import {
  BookingStatus,
  LeadStatus,
  PropertyAssignmentRole,
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
import { prisma } from "@/db/prisma.js";
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

const getDaysArray = (start: Date, end: Date): Date[] => {
  const arr: Date[] = [];
  const dt = new Date(start);
  dt.setHours(0, 0, 0, 0);
  const endDt = new Date(end);
  endDt.setHours(0, 0, 0, 0);
  while (dt <= endDt) {
    arr.push(new Date(dt));
    dt.setDate(dt.getDate() + 1);
  }
  return arr;
};

const formatDateOnly = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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
    allUsers,
  ] = await Promise.all([
    repo.getBookingsOverlapping(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getBookingsCreatedInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getPaymentsInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getRefundsInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getEnquiriesInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getQuotesInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getMaintenanceOverlapping(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getStatusHistoryInRange(query.startDate, query.endDate, propertyIdsToQuery),
    repo.getAllRoomsWithProperties(propertyIdsToQuery),
    prisma.user.findMany({
      where: {
        role: { in: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
    }),
  ]);

  const days = getDaysArray(query.startDate, query.endDate);

  // 1. Calculate Daily Occupancy
  const occupancy: DailyOccupancyDTO[] = [];
  const totalRoomsCount = rooms.length;

  for (const day of days) {
    const dayStr = formatDateOnly(day);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

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
    let occupiedNights = 0;
    for (const b of bookingsOverlapping) {
      if (b.checkIn < dayEnd && b.checkOut > dayStart) {
        for (const item of b.items) {
          if (item.roomId && rooms.some((r) => r.id === item.roomId)) {
            occupiedNights++;
          }
        }
      }
    }

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
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    const dayBookings = bookingsCreated.filter(
      (b) => b.createdAt >= dayStart && b.createdAt <= dayEnd,
    );

    let subtotal = 0;
    let discount = 0;
    let tax = 0;
    let total = 0;

    for (const b of dayBookings) {
      subtotal += Number(b.subtotalAmount);
      discount += Number(b.discountAmount);
      tax += Number(b.taxAmount);
      total += Number(b.totalAmount);
    }

    const dayPayments = payments.filter(
      (p) => p.createdAt >= dayStart && p.createdAt <= dayEnd,
    );
    const paid = dayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const dayRefunds = refunds.filter(
      (r) => r.createdAt >= dayStart && r.createdAt <= dayEnd,
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

  for (const b of bookingsCreated) {
    const isWalkIn = b.user?.createdByUserId !== null;
    const sourceKey = isWalkIn ? "WALK_IN" : "PUBLIC";
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
    bookingsCreated
      .filter((b) => ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status))
      .map((b) => b.guestEmailSnapshot.trim().toLowerCase()),
  );

  const convertedEnquiries = enquiries.filter((e) =>
    bookedEmails.has(e.email.trim().toLowerCase()),
  ).length;

  const convertedQuotes = quotes.filter((q) => {
    return bookingsCreated.some(
      (b) =>
        ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].includes(b.status) &&
        (b.userId === q.userId || b.guestEmailSnapshot.trim().toLowerCase() === q.user?.email.trim().toLowerCase()),
    );
  }).length;

  const totalEnquiries = enquiries.length;
  const totalQuotes = quotes.length;
  const enquiryConversionRate = totalEnquiries === 0 ? 0 : Math.round((convertedEnquiries / totalEnquiries) * 100);
  const quoteConversionRate = totalQuotes === 0 ? 0 : Math.round((convertedQuotes / totalQuotes) * 100);

  const conversions = {
    totalEnquiries,
    convertedEnquiries,
    enquiryConversionRate,
    totalQuotes,
    convertedQuotes,
    quoteConversionRate,
    totalBookings: bookingsCreated.length,
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
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

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

      let occupiedOnDay = 0;
      for (const b of bookingsOverlapping) {
        if (b.propertyId === propId && b.checkIn < dayEnd && b.checkOut > dayStart) {
          for (const item of b.items) {
            if (item.roomId && propRooms.some((r) => r.id === item.roomId)) {
              occupiedOnDay++;
            }
          }
        }
      }
      propOccupiedNights += Math.min(occupiedOnDay, availableOnDay);
    }

    const propBookingsCreated = bookingsCreated.filter((b) => b.propertyId === propId);
    const grossRevenue = propBookingsCreated.reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const propPayments = payments.filter((p) => p.propertyId === propId);
    const propRefunds = refunds.filter((r) => r.propertyId === propId);
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
    const walkinsCreated = bookingsCreated.filter((b) => b.user?.createdByUserId === u.id).length;

    const checkInsProcessed = statusHistory.filter(
      (h) => h.toStatus === "CHECKED_IN" && h.actorUserId === u.id,
    ).length;

    const checkOutsProcessed = statusHistory.filter(
      (h) => h.toStatus === "CHECKED_OUT" && h.actorUserId === u.id,
    ).length;

    const paymentsRecorded = payments.filter((p) => p.receivedByUserId === u.id).length;

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

