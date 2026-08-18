import { randomUUID } from "node:crypto";
import { HttpError } from "@/common/errors/http-error.js";
import { assertPropertyBusinessDateOpen } from "@/common/services/daily-close-guard.js";
import { recordPropertyAudit } from "@/common/services/property-audit.service.js";
import { assertPropertyInScope, getActor } from "@/common/services/scoping.service.js";
import { prisma } from "@/db/prisma.js";
import {
  BookingGroupStatus,
  BookingSource,
  BookingStatus,
  BookingTargetType,
  GroupFolioChargeStatus,
  MaintenanceStatus,
  Prisma,
  PropertyAuditAction,
  PropertyAuditEntityType,
  PropertyClosureStatus,
  RoomStatus,
} from "@/generated/prisma/client.js";
import {
  calculateGroupMemberFinancials,
  calculateGroupMemberSummary,
} from "./commercial.financials.js";

const groupInclude = {
  company: true,
  bookings: {
    include: {
      items: true,
      payments: { include: { refunds: true } },
      folioCharges: true,
    },
    orderBy: { checkIn: "asc" },
  },
  folioCharges: { orderBy: { createdAt: "asc" } },
  inventoryLocks: { orderBy: { createdAt: "asc" } },
  createdBy: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.BookingGroupInclude;

const companyData = (input: Record<string, unknown>) => {
  const entries = Object.entries(input).filter(
    ([key, value]) => key !== "reason" && value !== undefined,
  );
  return Object.fromEntries(entries);
};

const groupRef = () =>
  `GRP-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const mapGroup = (group: Prisma.BookingGroupGetPayload<{ include: typeof groupInclude }>) => {
  const memberSummary = calculateGroupMemberSummary(group.bookings);
  const groupCharges = group.folioCharges
    .filter((charge) => charge.status === GroupFolioChargeStatus.ACTIVE)
    .reduce((sum, charge) => sum.plus(charge.amount), new Prisma.Decimal(0));
  const balance = memberSummary.memberBalance.plus(groupCharges);

  return {
    ...group,
    bookings: group.bookings.map((booking) => {
      const financials = calculateGroupMemberFinancials(booking);
      return {
        id: booking.id,
        bookingRef: booking.bookingRef,
        guestNameSnapshot: booking.guestNameSnapshot,
        status: booking.status,
        totalAmount: booking.totalAmount.toString(),
        folioTotal: financials.folioTotal.toString(),
        grossAmount: financials.grossAmount.toString(),
        paidAmount: financials.paidAmount.toString(),
        refundedAmount: financials.refundedAmount.toString(),
        netPaidAmount: financials.netPaidAmount.toString(),
        balanceAmount: financials.balanceAmount.toString(),
      };
    }),
    memberTotal: memberSummary.memberTotal.toString(),
    memberFolioCharges: memberSummary.memberFolioCharges.toString(),
    memberValue: memberSummary.memberValue.toString(),
    groupCharges: groupCharges.toString(),
    paid: memberSummary.paid.toString(),
    refunded: memberSummary.refunded.toString(),
    netPaid: memberSummary.netPaid.toString(),
    memberBalance: memberSummary.memberBalance.toString(),
    nonCollectibleAmount: memberSummary.nonCollectibleAmount.toString(),
    balance: balance.toString(),
    heldRoomCount: group.inventoryLocks.filter(
      (lock) => lock.releasedAt === null && lock.expiresAt > new Date(),
    ).length,
  };
};

const getScopedGroup = async (userId: string, groupId: string) => {
  const actor = await getActor(userId);
  const group = await prisma.bookingGroup.findUnique({
    where: { id: groupId },
    include: groupInclude,
  });
  if (!group) throw new HttpError(404, "BOOKING_GROUP_NOT_FOUND", "Booking group not found");
  await assertPropertyInScope(actor, group.propertyId);
  return { actor, group };
};

export const listCompanies = async (userId: string, propertyId: string) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  return prisma.companyAccount.findMany({
    where: { propertyId },
    orderBy: { legalName: "asc" },
  });
};

export const createCompany = async (
  userId: string,
  propertyId: string,
  input: Record<string, unknown>,
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  return prisma.$transaction(async (tx) => {
    const company = await tx.companyAccount.create({
      data: {
        ...(companyData(input) as Prisma.CompanyAccountUncheckedCreateInput),
        propertyId,
        createdByUserId: actor.id,
      },
    });
    await recordPropertyAudit({
      propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.COMPANY,
      entityId: company.id,
      action: PropertyAuditAction.CREATED,
      nextData: company,
    }, tx);
    return company;
  });
};

export const updateCompany = async (
  userId: string,
  companyId: string,
  input: Record<string, unknown> & { reason: string },
) => {
  const actor = await getActor(userId);
  const existing = await prisma.companyAccount.findUnique({ where: { id: companyId } });
  if (!existing) throw new HttpError(404, "COMPANY_NOT_FOUND", "Company not found");
  await assertPropertyInScope(actor, existing.propertyId);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.companyAccount.update({
      where: { id: companyId },
      data: companyData(input),
    });
    await recordPropertyAudit({
      propertyId: existing.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.COMPANY,
      entityId: companyId,
      action: PropertyAuditAction.UPDATED,
      reason: input.reason,
      previousData: existing,
      nextData: updated,
    }, tx);
    return updated;
  });
};

export const listGroups = async (userId: string, propertyId: string) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  const groups = await prisma.bookingGroup.findMany({
    where: { propertyId },
    select: {
      id: true,
      propertyId: true,
      companyId: true,
      groupRef: true,
      name: true,
      status: true,
      checkIn: true,
      checkOut: true,
      expectedRooms: true,
      expectedGuests: true,
      releaseDate: true,
      company: {
        select: { id: true, legalName: true, isActive: true },
      },
      _count: {
        select: {
          inventoryLocks: {
            where: { releasedAt: null, expiresAt: { gt: new Date() } },
          },
        },
      },
    },
    orderBy: { checkIn: "asc" },
  });
  return groups.map(({ _count, ...group }) => ({
    ...group,
    heldRoomCount: _count.inventoryLocks,
  }));
};

export const getGroup = async (userId: string, groupId: string) => {
  const { group } = await getScopedGroup(userId, groupId);
  return mapGroup(group);
};

export const createGroup = async (
  userId: string,
  propertyId: string,
  input: {
    companyId?: string | undefined;
    name: string;
    checkIn: Date;
    checkOut: Date;
    expectedRooms: number;
    expectedGuests: number;
    releaseDate?: Date | undefined;
    billingNotes?: string | undefined;
  },
) => {
  const actor = await getActor(userId);
  await assertPropertyInScope(actor, propertyId);
  if (input.companyId !== undefined) {
    const company = await prisma.companyAccount.findFirst({
      where: { id: input.companyId, propertyId, isActive: true },
    });
    if (!company) throw new HttpError(404, "COMPANY_NOT_FOUND", "Active company not found for property");
  }
  if (input.releaseDate !== undefined && input.releaseDate <= new Date()) {
    throw new HttpError(
      422,
      "INVALID_GROUP_RELEASE_DATE",
      "Group release cutoff must be in the future",
    );
  }
  const created = await prisma.$transaction(async (tx) => {
    const group = await tx.bookingGroup.create({
      data: {
        groupRef: groupRef(),
        propertyId,
        ...(input.companyId !== undefined && { companyId: input.companyId }),
        name: input.name,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        expectedRooms: input.expectedRooms,
        expectedGuests: input.expectedGuests,
        ...(input.releaseDate !== undefined && { releaseDate: input.releaseDate }),
        ...(input.billingNotes !== undefined && { billingNotes: input.billingNotes }),
        createdByUserId: actor.id,
      },
    });
    await recordPropertyAudit({
      propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: group.id,
      action: PropertyAuditAction.CREATED,
      nextData: group,
    }, tx);
    return group;
  });
  return getGroup(userId, created.id);
};

export const updateGroupStatus = async (
  userId: string,
  groupId: string,
  status: BookingGroupStatus,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  if (status === group.status) return mapGroup(group);
  const allowedTransitions: Record<BookingGroupStatus, BookingGroupStatus[]> = {
    PROSPECT: [BookingGroupStatus.TENTATIVE, BookingGroupStatus.CONFIRMED, BookingGroupStatus.CANCELLED],
    TENTATIVE: [BookingGroupStatus.PROSPECT, BookingGroupStatus.CONFIRMED, BookingGroupStatus.CANCELLED],
    CONFIRMED: [BookingGroupStatus.TENTATIVE, BookingGroupStatus.IN_HOUSE, BookingGroupStatus.CANCELLED],
    IN_HOUSE: [BookingGroupStatus.COMPLETED, BookingGroupStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
  };
  if (!allowedTransitions[group.status].includes(status)) {
    throw new HttpError(409, "INVALID_GROUP_STATUS_TRANSITION", `Group cannot move from ${group.status} to ${status}`);
  }
  if (status === BookingGroupStatus.CANCELLED || status === BookingGroupStatus.COMPLETED) {
    const terminalStatuses = new Set<BookingStatus>([
      BookingStatus.CANCELLED,
      BookingStatus.NO_SHOW,
      BookingStatus.CHECKED_OUT,
    ]);
    const active = group.bookings.some((booking) => !terminalStatuses.has(booking.status));
    if (active) {
      throw new HttpError(
        409,
        "GROUP_HAS_ACTIVE_BOOKINGS",
        "Resolve all member bookings before closing the group",
      );
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.bookingGroup.update({ where: { id: groupId }, data: { status } });
    if (status === BookingGroupStatus.CANCELLED || status === BookingGroupStatus.COMPLETED) {
      await tx.inventoryLock.updateMany({
        where: { bookingGroupId: groupId, releasedAt: null },
        data: { releasedAt: new Date() },
      });
    }
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.STATUS_CHANGED,
      reason,
      previousData: { status: group.status },
      nextData: { status },
    }, tx);
  });
  return getGroup(userId, groupId);
};

export const updateGroupDetails = async (
  userId: string,
  groupId: string,
  input: {
    name?: string | undefined;
    checkIn?: Date | undefined;
    checkOut?: Date | undefined;
    expectedRooms?: number | undefined;
    expectedGuests?: number | undefined;
    releaseDate?: Date | null | undefined;
    reason: string;
  },
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  if (
    group.status !== BookingGroupStatus.PROSPECT &&
    group.status !== BookingGroupStatus.TENTATIVE
  ) {
    throw new HttpError(
      409,
      "GROUP_DETAILS_LOCKED",
      "Group details can only be edited while the group is Prospect or Tentative",
    );
  }
  const checkIn = input.checkIn ?? group.checkIn;
  const checkOut = input.checkOut ?? group.checkOut;
  const releaseDate =
    input.releaseDate === undefined ? group.releaseDate : input.releaseDate;
  if (checkOut <= checkIn) {
    throw new HttpError(422, "INVALID_GROUP_DATES", "Check-out must be after check-in");
  }
  if (
    input.releaseDate !== undefined &&
    releaseDate !== null &&
    releaseDate <= new Date()
  ) {
    throw new HttpError(
      422,
      "INVALID_GROUP_RELEASE_DATE",
      "Group release cutoff must be in the future",
    );
  }
  if (releaseDate !== null && releaseDate > checkIn) {
    throw new HttpError(
      422,
      "INVALID_GROUP_RELEASE_DATE",
      "Release date cannot be after check-in",
    );
  }

  const details: Prisma.BookingGroupUpdateInput = {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.checkIn !== undefined && { checkIn: input.checkIn }),
    ...(input.checkOut !== undefined && { checkOut: input.checkOut }),
    ...(input.expectedRooms !== undefined && { expectedRooms: input.expectedRooms }),
    ...(input.expectedGuests !== undefined && { expectedGuests: input.expectedGuests }),
    ...(input.releaseDate !== undefined && { releaseDate: input.releaseDate }),
  };
  await prisma.$transaction(async (tx) => {
    const [currentGroup, roomHolds, bookings, folioCharges] = await Promise.all([
      tx.bookingGroup.findUniqueOrThrow({
        where: { id: groupId },
        select: { status: true },
      }),
      tx.inventoryLock.count({ where: { bookingGroupId: groupId } }),
      tx.booking.count({ where: { bookingGroupId: groupId } }),
      tx.groupFolioCharge.count({ where: { bookingGroupId: groupId } }),
    ]);
    if (
      currentGroup.status !== BookingGroupStatus.PROSPECT &&
      currentGroup.status !== BookingGroupStatus.TENTATIVE
    ) {
      throw new HttpError(
        409,
        "GROUP_DETAILS_LOCKED",
        "Group details can only be edited while the group is Prospect or Tentative",
      );
    }
    if (roomHolds + bookings + folioCharges > 0) {
      throw new HttpError(
        409,
        "GROUP_DETAILS_LOCKED",
        "Group details cannot be edited after room holds, guest bookings, or folio charges have been created",
      );
    }
    const updated = await tx.bookingGroup.update({
      where: { id: groupId },
      data: details,
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.UPDATED,
      reason: input.reason,
      previousData: {
        name: group.name,
        checkIn: group.checkIn,
        checkOut: group.checkOut,
        expectedRooms: group.expectedRooms,
        expectedGuests: group.expectedGuests,
        releaseDate: group.releaseDate,
      },
      nextData: {
        name: updated.name,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        expectedRooms: updated.expectedRooms,
        expectedGuests: updated.expectedGuests,
        releaseDate: updated.releaseDate,
      },
      metadata: { operation: "DETAILS_UPDATED" },
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getGroup(userId, groupId);
};

export const holdGroupRooms = async (
  userId: string,
  groupId: string,
  roomIds: string[],
  releaseDate: Date,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  if (
    group.status === BookingGroupStatus.CANCELLED ||
    group.status === BookingGroupStatus.COMPLETED
  ) {
    throw new HttpError(409, "GROUP_CLOSED", "Closed groups cannot hold inventory");
  }
  const now = new Date();
  if (group.releaseDate !== null && group.releaseDate <= now) {
    throw new HttpError(
      409,
      "GROUP_RELEASE_CUTOFF_PASSED",
      "The group room-release cutoff has passed. Update the group cutoff before holding more rooms",
    );
  }
  if (releaseDate <= now) {
    throw new HttpError(422, "INVALID_RELEASE_DATE", "Release date must be in the future and no later than check-in");
  }
  if (group.releaseDate !== null && releaseDate > group.releaseDate) {
    throw new HttpError(
      422,
      "GROUP_RELEASE_CUTOFF_EXCEEDED",
      "Room release time cannot be later than the group release cutoff",
    );
  }
  if (releaseDate > group.checkIn) {
    throw new HttpError(422, "INVALID_RELEASE_DATE", "Release date must be in the future and no later than check-in");
  }

  await prisma.$transaction(async (tx) => {
    const rooms = await tx.room.findMany({
      where: {
        id: { in: roomIds },
        isActive: true,
        status: RoomStatus.AVAILABLE,
        unit: { propertyId: group.propertyId, isActive: true },
      },
      select: { id: true, unitId: true },
    });
    if (rooms.length !== roomIds.length) {
      throw new HttpError(404, "ROOM_NOT_AVAILABLE", "One or more rooms are unavailable or outside the group property");
    }
    const unitIds = [...new Set(rooms.map((room) => room.unitId))];
    const [bookings, maintenance, closures, locks] = await Promise.all([
      tx.bookingItem.count({
        where: {
          OR: [{ roomId: { in: roomIds } }, { unitId: { in: unitIds } }],
          booking: {
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW, BookingStatus.CHECKED_OUT] },
            checkIn: { lt: group.checkOut },
            checkOut: { gt: group.checkIn },
          },
        },
      }),
      tx.maintenanceBlock.count({
        where: {
          propertyId: group.propertyId,
          status: { notIn: [MaintenanceStatus.CANCELLED, MaintenanceStatus.RESOLVED] },
          OR: [{ roomId: { in: roomIds } }, { unitId: { in: unitIds } }],
          startDate: { lt: group.checkOut },
          endDate: { gt: group.checkIn },
        },
      }),
      tx.propertyClosure.count({
        where: {
          propertyId: group.propertyId,
          status: PropertyClosureStatus.ACTIVE,
          startDate: { lt: group.checkOut },
          endDate: { gt: group.checkIn },
        },
      }),
      tx.inventoryLock.count({
        where: {
          propertyId: group.propertyId,
          bookingGroupId: { not: groupId },
          releasedAt: null,
          expiresAt: { gt: new Date() },
          OR: [{ roomId: { in: roomIds } }, { unitId: { in: unitIds } }],
          checkIn: { lt: group.checkOut },
          checkOut: { gt: group.checkIn },
        },
      }),
    ]);
    if (bookings + maintenance + closures + locks > 0) {
      throw new HttpError(409, "GROUP_INVENTORY_CONFLICT", "One or more rooms conflict with bookings, maintenance, closure, or another hold");
    }
    await tx.inventoryLock.createMany({
      data: roomIds.map((roomId) => ({
        lockToken: randomUUID(),
        bookingGroupId: groupId,
        propertyId: group.propertyId,
        targetType: BookingTargetType.ROOM,
        roomId,
        checkIn: group.checkIn,
        checkOut: group.checkOut,
        expiresAt: releaseDate,
        createdByUserId: actor.id,
      })),
      skipDuplicates: true,
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.UPDATED,
      reason,
      metadata: { operation: "ROOMS_HELD", roomIds, releaseDate },
    }, tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return getGroup(userId, groupId);
};

export const releaseGroupRooms = async (
  userId: string,
  groupId: string,
  roomIds: string[] | undefined,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  await prisma.$transaction(async (tx) => {
    await tx.inventoryLock.updateMany({
      where: {
        bookingGroupId: groupId,
        releasedAt: null,
        ...(roomIds !== undefined && { roomId: { in: roomIds } }),
      },
      data: { releasedAt: new Date() },
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.UPDATED,
      reason,
      metadata: { operation: "ROOMS_RELEASED", roomIds: roomIds ?? "ALL" },
    }, tx);
  });
  return getGroup(userId, groupId);
};

export const addGroupMember = async (
  userId: string,
  groupId: string,
  bookingId: string,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { items: true } });
  if (!booking || booking.propertyId !== group.propertyId) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found in group property");
  }
  if (booking.bookingGroupId !== null && booking.bookingGroupId !== groupId) {
    throw new HttpError(409, "BOOKING_ALREADY_GROUPED", "Booking already belongs to another group");
  }
  if (booking.checkIn < group.checkIn || booking.checkOut > group.checkOut) {
    throw new HttpError(422, "BOOKING_OUTSIDE_GROUP_DATES", "Booking stay must fall within group dates");
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        bookingGroupId: groupId,
        companyId: group.companyId,
        source: group.companyId === null ? BookingSource.GROUP : BookingSource.CORPORATE,
        ...(group.company !== null && {
          recipientLegalName: group.company.legalName,
          recipientGstin: group.company.gstin,
          billingAddressSnapshot: group.company.billingAddress,
          placeOfSupplyStateCode: group.company.stateCode,
        }),
      },
    });
    const roomIds = booking.items.flatMap((item) => item.roomId === null ? [] : [item.roomId]);
    if (roomIds.length > 0) {
      await tx.inventoryLock.updateMany({
        where: { bookingGroupId: groupId, roomId: { in: roomIds }, releasedAt: null },
        data: { releasedAt: new Date(), bookingId },
      });
    }
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.UPDATED,
      reason,
      metadata: { operation: "MEMBER_ADDED", bookingId },
    }, tx);
  });
  return getGroup(userId, groupId);
};

export const removeGroupMember = async (
  userId: string,
  groupId: string,
  bookingId: string,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  const booking = group.bookings.find((item) => item.id === bookingId);
  if (!booking) throw new HttpError(404, "GROUP_MEMBER_NOT_FOUND", "Booking is not a group member");
  if (
    booking.status === BookingStatus.CHECKED_IN ||
    booking.status === BookingStatus.CHECKED_OUT
  ) {
    throw new HttpError(409, "GROUP_MEMBER_STAY_STARTED", "Started stays cannot be detached from a group");
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { bookingGroupId: null, companyId: null, source: BookingSource.WALK_IN },
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.BOOKING_GROUP,
      entityId: groupId,
      action: PropertyAuditAction.UPDATED,
      reason,
      metadata: { operation: "MEMBER_REMOVED", bookingId },
    }, tx);
  });
  return getGroup(userId, groupId);
};

export const addGroupCharge = async (
  userId: string,
  groupId: string,
  input: { description: string; amount: number; note?: string | undefined },
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  await assertPropertyBusinessDateOpen(group.propertyId, { operation: "Group folio posting" });
  await prisma.$transaction(async (tx) => {
    const charge = await tx.groupFolioCharge.create({
      data: {
        bookingGroupId: groupId,
        propertyId: group.propertyId,
        description: input.description,
        amount: input.amount,
        ...(input.note !== undefined && { note: input.note }),
        createdByUserId: actor.id,
      },
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.GROUP_FOLIO,
      entityId: charge.id,
      action: PropertyAuditAction.CREATED,
      nextData: charge,
    }, tx);
  });
  return getGroup(userId, groupId);
};

export const voidGroupCharge = async (
  userId: string,
  groupId: string,
  chargeId: string,
  reason: string,
) => {
  const { actor, group } = await getScopedGroup(userId, groupId);
  await assertPropertyBusinessDateOpen(group.propertyId, { operation: "Group folio void" });
  const charge = group.folioCharges.find((item) => item.id === chargeId);
  if (!charge) throw new HttpError(404, "GROUP_CHARGE_NOT_FOUND", "Group folio charge not found");
  if (charge.status === GroupFolioChargeStatus.VOID) return getGroup(userId, groupId);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.groupFolioCharge.update({
      where: { id: chargeId },
      data: {
        status: GroupFolioChargeStatus.VOID,
        voidedByUserId: actor.id,
        voidedAt: new Date(),
        voidReason: reason,
      },
    });
    await recordPropertyAudit({
      propertyId: group.propertyId,
      actorUserId: actor.id,
      entityType: PropertyAuditEntityType.GROUP_FOLIO,
      entityId: chargeId,
      action: PropertyAuditAction.VOIDED,
      reason,
      previousData: charge,
      nextData: updated,
    }, tx);
  });
  return getGroup(userId, groupId);
};
