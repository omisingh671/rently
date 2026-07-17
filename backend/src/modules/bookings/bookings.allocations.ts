import {
  BookingRoomAllocationSource,
  BookingTargetType,
  Prisma,
} from "@/generated/prisma/client.js";

type DesiredAllocation = {
  roomId: string;
  bookingItemId: string | null;
};

export const buildRoomAllocationSyncPlan = (
  activeAllocations: ReadonlyArray<{
    id: string;
    roomId: string;
    effectiveFrom: Date;
  }>,
  targets: readonly DesiredAllocation[],
  effectiveFrom: Date,
) => {
  const desiredRoomIds = new Set(targets.map((target) => target.roomId));
  const activeRoomIds = new Set(activeAllocations.map((row) => row.roomId));
  return {
    closures: activeAllocations
      .filter((allocation) => !desiredRoomIds.has(allocation.roomId))
      .map((allocation) => ({
        id: allocation.id,
        effectiveTo:
          effectiveFrom < allocation.effectiveFrom
            ? allocation.effectiveFrom
            : effectiveFrom,
      })),
    openings: targets.filter(
      (target) => !activeRoomIds.has(target.roomId),
    ),
  };
};

const getCurrentAllocationTargets = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
): Promise<{
  propertyId: string;
  targets: DesiredAllocation[];
}> => {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: {
      propertyId: true,
      items: {
        select: {
          id: true,
          targetType: true,
          roomId: true,
          unitId: true,
        },
      },
    },
  });
  const unitIds = Array.from(
    new Set(
      booking.items
        .filter(
          (item) =>
            item.targetType === BookingTargetType.UNIT && item.unitId !== null,
        )
        .map((item) => item.unitId as string),
    ),
  );
  const unitRooms =
    unitIds.length === 0
      ? []
      : await tx.room.findMany({
          where: { unitId: { in: unitIds } },
          select: { id: true, unitId: true },
        });
  const targets = new Map<string, DesiredAllocation>();

  for (const item of booking.items) {
    if (item.roomId !== null) {
      targets.set(item.roomId, {
        roomId: item.roomId,
        bookingItemId: item.id,
      });
      continue;
    }
    if (item.targetType === BookingTargetType.UNIT && item.unitId !== null) {
      for (const room of unitRooms.filter(
        (candidate) => candidate.unitId === item.unitId,
      )) {
        targets.set(room.id, {
          roomId: room.id,
          bookingItemId: item.id,
        });
      }
    }
  }

  return { propertyId: booking.propertyId, targets: [...targets.values()] };
};

export const syncCurrentBookingRoomAllocations = async (
  tx: Prisma.TransactionClient,
  input: {
    bookingId: string;
    actorUserId: string | null;
    effectiveFrom: Date;
    source: BookingRoomAllocationSource;
  },
) => {
  const [{ propertyId, targets }, activeAllocations] = await Promise.all([
    getCurrentAllocationTargets(tx, input.bookingId),
    tx.bookingRoomAllocation.findMany({
      where: { bookingId: input.bookingId, effectiveTo: null },
    }),
  ]);
  const plan = buildRoomAllocationSyncPlan(
    activeAllocations,
    targets,
    input.effectiveFrom,
  );
  for (const allocation of plan.closures) {
    await tx.bookingRoomAllocation.update({
      where: { id: allocation.id },
      data: { effectiveTo: allocation.effectiveTo },
    });
  }

  if (plan.openings.length > 0) {
    await tx.bookingRoomAllocation.createMany({
      data: plan.openings.map((target) => ({
        bookingId: input.bookingId,
        bookingItemId: target.bookingItemId,
        propertyId,
        roomId: target.roomId,
        actorUserId: input.actorUserId,
        source: input.source,
        effectiveFrom: input.effectiveFrom,
      })),
    });
  }
};

export const closeActiveBookingRoomAllocations = async (
  tx: Prisma.TransactionClient,
  bookingId: string,
  effectiveTo: Date,
) => {
  const activeAllocations = await tx.bookingRoomAllocation.findMany({
    where: { bookingId, effectiveTo: null },
  });
  for (const allocation of activeAllocations) {
    await tx.bookingRoomAllocation.update({
      where: { id: allocation.id },
      data: {
        effectiveTo:
          effectiveTo < allocation.effectiveFrom
            ? allocation.effectiveFrom
            : effectiveTo,
      },
    });
  }
};
