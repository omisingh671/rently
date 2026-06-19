import {
  Prisma,
  RoomHousekeepingStatus,
} from "@/generated/prisma/client.js";
import { HttpError } from "@/common/errors/http-error.js";
import type { UpdateRoomHousekeepingInput } from "./bookings.inputs.js";

const allowedHousekeepingTransitions: Record<
  RoomHousekeepingStatus,
  readonly RoomHousekeepingStatus[]
> = {
  [RoomHousekeepingStatus.DIRTY]: [RoomHousekeepingStatus.CLEANING],
  [RoomHousekeepingStatus.CLEANING]: [
    RoomHousekeepingStatus.DIRTY,
    RoomHousekeepingStatus.CLEAN,
  ],
  [RoomHousekeepingStatus.CLEAN]: [
    RoomHousekeepingStatus.DIRTY,
    RoomHousekeepingStatus.INSPECTED,
  ],
  [RoomHousekeepingStatus.INSPECTED]: [RoomHousekeepingStatus.DIRTY],
};

export const updateRoomHousekeepingInTransaction = async (
  tx: Prisma.TransactionClient,
  input: {
    propertyId: string;
    roomId: string;
    actorUserId: string;
    housekeeping: UpdateRoomHousekeepingInput;
  },
) => {
  const room = await tx.room.findUnique({
    where: { id: input.roomId },
    include: { unit: true },
  });
  if (!room || room.unit.propertyId !== input.propertyId) {
    throw new HttpError(404, "ROOM_NOT_FOUND", "Room not found");
  }
  if (room.housekeepingStatus !== input.housekeeping.expectedStatus) {
    throw new HttpError(
      409,
      "HOUSEKEEPING_STATUS_CONFLICT",
      "Room housekeeping status changed. Reload and try again.",
    );
  }
  if (
    !allowedHousekeepingTransitions[room.housekeepingStatus].includes(
      input.housekeeping.status,
    )
  ) {
    throw new HttpError(
      409,
      "INVALID_HOUSEKEEPING_TRANSITION",
      `Cannot move housekeeping from ${room.housekeepingStatus} to ${input.housekeeping.status}`,
    );
  }
  await tx.room.update({
    where: { id: input.roomId },
    data: { housekeepingStatus: input.housekeeping.status },
  });
  const event = await tx.roomHousekeepingEvent.create({
    data: {
      propertyId: input.propertyId,
      roomId: input.roomId,
      actorUserId: input.actorUserId,
      fromStatus: room.housekeepingStatus,
      toStatus: input.housekeeping.status,
      ...(input.housekeeping.note !== undefined && {
        note: input.housekeeping.note,
      }),
    },
  });
  return {
    roomId: input.roomId,
    status: input.housekeeping.status,
    updatedAt: event.createdAt,
  };
};
