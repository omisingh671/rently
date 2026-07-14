export type PricingCoverageRate = {
  roomId: string | null;
  unitId: string | null;
};

export type PricingCoverageRoom = {
  roomId: string;
  unitId: string;
  isActive: boolean;
};

export const countRoomsWithoutActivePricing = (
  rooms: PricingCoverageRoom[],
  activeRates: PricingCoverageRate[],
) => {
  const hasPropertyWideRate = activeRates.some(
    (rate) => !rate.roomId && !rate.unitId,
  );
  if (hasPropertyWideRate) {
    return 0;
  }

  const pricedRoomIds = new Set(
    activeRates
      .map((rate) => rate.roomId)
      .filter((roomId): roomId is string => Boolean(roomId)),
  );
  const pricedUnitIds = new Set(
    activeRates
      .filter((rate) => !rate.roomId)
      .map((rate) => rate.unitId)
      .filter((unitId): unitId is string => Boolean(unitId)),
  );

  return rooms.filter(
    (room) =>
      room.isActive &&
      !pricedRoomIds.has(room.roomId) &&
      !pricedUnitIds.has(room.unitId),
  ).length;
};
