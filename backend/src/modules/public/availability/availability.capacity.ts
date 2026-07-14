import type * as repo from "./availability.repository.js";

export interface RoomAllocation {
  room: repo.PublicAvailabilityRoomRecord;
  guestCount: number;
}

export interface UnitAllocation {
  unit: repo.PublicAvailabilityUnitRecord;
  guestCount: number;
}

export const getRoomCapacity = (room: { maxOccupancy: number }) =>
  Math.max(1, room.maxOccupancy);

export const getUnitCapacity = (
  unit: repo.PublicAvailabilityUnitRecord,
) =>
  unit.rooms
    .filter((room) => room.isActive && room.status === "AVAILABLE")
    .reduce((total, room) => total + getRoomCapacity(room), 0);

export const buildRoomAllocation = (
  rooms: repo.PublicAvailabilityRoomRecord[],
  guests: number,
): RoomAllocation[] | null => {
  const allocations: RoomAllocation[] = [];
  let remainingGuests = guests;

  for (const room of rooms) {
    if (remainingGuests <= 0) {
      break;
    }

    const guestCount = Math.min(getRoomCapacity(room), remainingGuests);
    allocations.push({ room, guestCount });
    remainingGuests -= guestCount;
  }

  return remainingGuests === 0 ? allocations : null;
};

export const buildUnitAllocation = (
  units: repo.PublicAvailabilityUnitRecord[],
  guests: number,
): UnitAllocation[] | null => {
  const allocations: UnitAllocation[] = [];
  let remainingGuests = guests;

  for (const unit of units) {
    if (remainingGuests <= 0) {
      break;
    }

    const capacity = getUnitCapacity(unit);
    const guestCount = Math.min(capacity, remainingGuests);
    allocations.push({ unit, guestCount });
    remainingGuests -= guestCount;
  }

  return remainingGuests === 0 ? allocations : null;
};
