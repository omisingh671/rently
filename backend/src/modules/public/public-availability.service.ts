import { createHmac } from "node:crypto";
import {
  BookingTargetType,
  ComfortOption,
  type Prisma,
} from "@/generated/prisma/client.js";
import { env } from "@/config/env.js";
import type {
  CheckAvailabilityInput,
  PublicSpaceTarget,
} from "./public.inputs.js";
import type { PublicAvailabilityOptionDTO } from "./public.dto.js";
import * as repo from "./public.repository.js";

const maxPublicOptions = 6;
const publicRoomCapacityCap = 2;

interface StayScope {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

interface PublicInventoryItem {
  target: PublicSpaceTarget;
  propertyId: string;
  unitId: string | null;
  floor: number | null;
  capacity: number;
  guestCount: number;
  priceGuestCount: number;
  pricePerNight: number;
  productId: string;
  productName: string;
  targetLabel: string;
  publicLabel: string;
}

export interface PublicAvailabilityOptionInternal {
  optionId: string;
  title: string;
  guestSplit: string;
  totalCapacity: number;
  comfortOption: ComfortOption;
  nightlyTotal: number;
  stayTotal: number;
  nights: number;
  itemCount: number;
  propertyId: string;
  items: PublicInventoryItem[];
}

const getRoomCapacity = (room: { maxOccupancy: number }) =>
  Math.max(1, Math.min(room.maxOccupancy, publicRoomCapacityCap));

const getUnitCapacity = (unit: repo.PublicAvailabilityUnitRecord) =>
  unit.rooms
    .filter((room) => room.isActive && room.status === "AVAILABLE")
    .reduce((total, room) => total + getRoomCapacity(room), 0);

const formatCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const buildTitle = (items: PublicInventoryItem[]) => {
  const units = items.filter(
    (item) => item.target.targetType === BookingTargetType.UNIT,
  ).length;
  const rooms = items.length - units;
  const parts = [
    units > 0 ? formatCount(units, "Unit", "Units") : null,
    rooms > 0 ? formatCount(rooms, "Room", "Rooms") : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" + ");
};

const buildOptionSignature = (
  input: CheckAvailabilityInput,
  items: PublicInventoryItem[],
) =>
  JSON.stringify({
    checkIn: input.checkIn.toISOString(),
    checkOut: input.checkOut.toISOString(),
    guests: input.guests,
    comfortOption: input.comfortOption,
    items: items.map((item) => ({
      targetType: item.target.targetType,
      roomId: item.target.roomId,
      unitId: item.target.unitId,
      guestCount: item.guestCount,
      productId: item.productId,
      pricePerNight: item.pricePerNight,
    })),
  });

const buildOptionId = (
  input: CheckAvailabilityInput,
  items: PublicInventoryItem[],
) =>
  createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(buildOptionSignature(input, items))
    .digest("hex")
    .slice(0, 32);

const mapOptionDTO = (
  option: PublicAvailabilityOptionInternal,
): PublicAvailabilityOptionDTO => ({
  optionId: option.optionId,
  title: option.title,
  guestSplit: option.guestSplit,
  totalCapacity: option.totalCapacity,
  comfortOption: option.comfortOption,
  nightlyTotal: option.nightlyTotal,
  stayTotal: option.stayTotal,
  nights: option.nights,
  itemCount: option.itemCount,
});

const optionRank = (
  option: PublicAvailabilityOptionInternal,
  requestedGuests: number,
) => {
  const capacityFit = option.totalCapacity - requestedGuests;
  const unitGroups = new Set(
    option.items.map((item) => item.unitId).filter(Boolean),
  ).size;
  const floorGroups = new Set(
    option.items.map((item) => item.floor).filter((floor) => floor !== null),
  ).size;

  return {
    capacityFit,
    itemCount: option.itemCount,
    grouping: unitGroups + floorGroups,
    nightlyTotal: option.nightlyTotal,
  };
};

const sortOptions = (
  left: PublicAvailabilityOptionInternal,
  right: PublicAvailabilityOptionInternal,
  requestedGuests: number,
) => {
  const leftRank = optionRank(left, requestedGuests);
  const rightRank = optionRank(right, requestedGuests);

  return (
    leftRank.capacityFit - rightRank.capacityFit ||
    leftRank.itemCount - rightRank.itemCount ||
    leftRank.grouping - rightRank.grouping ||
    leftRank.nightlyTotal - rightRank.nightlyTotal
  );
};

const hasInventoryOverlap = async (
  propertyId: string,
  target: PublicSpaceTarget,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
) => {
  const [hasBooking, hasMaintenance] = await Promise.all([
    repo.hasOverlappingBooking(target, stay.checkIn, stay.checkOut, tx),
    repo.hasOverlappingMaintenance(
      propertyId,
      target,
      stay.checkIn,
      stay.checkOut,
      tx,
    ),
  ]);

  return hasBooking || hasMaintenance;
};

const loadAvailableRooms = async (
  tenantId: string,
  comfortOption: ComfortOption,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
) => {
  const rooms = await repo.listAvailabilityRooms(tenantId, comfortOption, tx);
  const availableRooms = [];

  for (const room of rooms) {
    const target = {
      targetType: BookingTargetType.ROOM,
      unitId: room.unitId,
      roomId: room.id,
    };

    if (
      !(await hasInventoryOverlap(room.unit.propertyId, target, stay, tx))
    ) {
      availableRooms.push(room);
    }
  }

  return availableRooms;
};

const loadAvailableUnits = async (
  tenantId: string,
  comfortOption: ComfortOption,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
) => {
  const units = await repo.listAvailabilityUnits(tenantId, comfortOption, tx);
  const availableUnits = [];

  for (const unit of units) {
    const target = {
      targetType: BookingTargetType.UNIT,
      unitId: unit.id,
      roomId: null,
    };

    if (
      getUnitCapacity(unit) > 0 &&
      !(await hasInventoryOverlap(unit.propertyId, target, stay, tx))
    ) {
      availableUnits.push(unit);
    }
  }

  return availableUnits;
};

const priceTarget = async (
  target: PublicSpaceTarget,
  propertyId: string,
  tenantId: string,
  comfortOption: ComfortOption,
  guestCount: number,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
) => {
  const pricing = await repo.findActivePricingForTarget(
    target,
    new Date(),
    tenantId,
    {
      guestCount,
      comfortOption,
    },
    stay,
    tx,
  );

  if (!pricing || pricing.propertyId !== propertyId) {
    return null;
  }

  return pricing;
};

const toPricedRoomItem = async (
  room: repo.PublicAvailabilityRoomRecord,
  guestCount: number,
  index: number,
  tenantId: string,
  comfortOption: ComfortOption,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
): Promise<PublicInventoryItem | null> => {
  const target = {
    targetType: BookingTargetType.ROOM,
    unitId: room.unitId,
    roomId: room.id,
  };
  const pricing = await priceTarget(
    target,
    room.unit.propertyId,
    tenantId,
    comfortOption,
    guestCount,
    stay,
    tx,
  );

  if (!pricing) {
    return null;
  }

  return {
    target,
    propertyId: room.unit.propertyId,
    unitId: room.unitId,
    floor: room.unit.floor,
    capacity: getRoomCapacity(room),
    guestCount,
    priceGuestCount: guestCount,
    pricePerNight: Number(pricing.price),
    productId: pricing.productId,
    productName: pricing.product.name,
    targetLabel: `Room ${index + 1}`,
    publicLabel: `Room ${index + 1}`,
  };
};

const toPricedUnitItem = async (
  unit: repo.PublicAvailabilityUnitRecord,
  guestCount: number,
  index: number,
  tenantId: string,
  comfortOption: ComfortOption,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
): Promise<PublicInventoryItem | null> => {
  const capacity = getUnitCapacity(unit);
  const target = {
    targetType: BookingTargetType.UNIT,
    unitId: unit.id,
    roomId: null,
  };
  const pricing = await priceTarget(
    target,
    unit.propertyId,
    tenantId,
    comfortOption,
    capacity,
    stay,
    tx,
  );

  if (!pricing) {
    return null;
  }

  return {
    target,
    propertyId: unit.propertyId,
    unitId: unit.id,
    floor: unit.floor,
    capacity,
    guestCount,
    priceGuestCount: capacity,
    pricePerNight: Number(pricing.price),
    productId: pricing.productId,
    productName: pricing.product.name,
    targetLabel: `Unit ${index + 1}`,
    publicLabel: `Unit ${index + 1}`,
  };
};

const buildRoomAllocation = (
  rooms: repo.PublicAvailabilityRoomRecord[],
  guests: number,
) => {
  const allocations = [];
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

const buildUnitAllocation = (
  units: repo.PublicAvailabilityUnitRecord[],
  guests: number,
) => {
  const allocations = [];
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

const toOption = (
  input: CheckAvailabilityInput,
  stay: StayScope,
  items: PublicInventoryItem[],
): PublicAvailabilityOptionInternal | null => {
  if (items.length === 0) {
    return null;
  }

  const propertyIds = new Set(items.map((item) => item.propertyId));
  if (propertyIds.size !== 1) {
    return null;
  }

  const totalCapacity = items.reduce((total, item) => total + item.capacity, 0);
  const nightlyTotal = items.reduce(
    (total, item) => total + item.pricePerNight,
    0,
  );

  return {
    optionId: buildOptionId(input, items),
    title: buildTitle(items),
    guestSplit: items.map((item) => item.guestCount).join(" + "),
    totalCapacity,
    comfortOption: input.comfortOption,
    nightlyTotal,
    stayTotal: nightlyTotal * stay.nights,
    nights: stay.nights,
    itemCount: items.length,
    propertyId: items[0]?.propertyId ?? "",
    items,
  };
};

const addOption = async (
  options: PublicAvailabilityOptionInternal[],
  input: CheckAvailabilityInput,
  stay: StayScope,
  itemFactories: Array<() => Promise<PublicInventoryItem | null>>,
) => {
  const items = [];

  for (const itemFactory of itemFactories) {
    const item = await itemFactory();
    if (!item) {
      return;
    }
    items.push(item);
  }

  const option = toOption(input, stay, items);
  if (option) {
    options.push(option);
  }
};

export const generateAvailabilityOptions = async (
  input: CheckAvailabilityInput,
  tenantId: string,
  nights: number,
  tx?: Prisma.TransactionClient,
): Promise<PublicAvailabilityOptionInternal[]> => {
  const stay = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
  };
  const [rooms, units] = await Promise.all([
    loadAvailableRooms(tenantId, input.comfortOption, stay, tx),
    loadAvailableUnits(tenantId, input.comfortOption, stay, tx),
  ]);
  const options: PublicAvailabilityOptionInternal[] = [];

  const unitsByCapacityAsc = [...units].sort(
    (left, right) => getUnitCapacity(left) - getUnitCapacity(right),
  );
  const unitsByCapacityDesc = [...units].sort(
    (left, right) => getUnitCapacity(right) - getUnitCapacity(left),
  );
  const roomsByGroup = [...rooms].sort(
    (left, right) =>
      left.unit.propertyId.localeCompare(right.unit.propertyId) ||
      left.unitId.localeCompare(right.unitId) ||
      left.unit.floor - right.unit.floor ||
      right.maxOccupancy - left.maxOccupancy ||
      left.number.localeCompare(right.number),
  );

  for (const unit of unitsByCapacityAsc.filter(
    (candidate) => getUnitCapacity(candidate) >= input.guests,
  )) {
    await addOption(options, input, stay, [
      () =>
        toPricedUnitItem(
          unit,
          input.guests,
          0,
          tenantId,
          input.comfortOption,
          stay,
          tx,
        ),
    ]);
  }

  const multiUnitAllocation = buildUnitAllocation(
    unitsByCapacityDesc,
    input.guests,
  );
  if (multiUnitAllocation && multiUnitAllocation.length > 1) {
    await addOption(
      options,
      input,
      stay,
      multiUnitAllocation.map((allocation, index) => () =>
        toPricedUnitItem(
          allocation.unit,
          allocation.guestCount,
          index,
          tenantId,
          input.comfortOption,
          stay,
          tx,
        ),
      ),
    );
  }

  const roomAllocation = buildRoomAllocation(roomsByGroup, input.guests);
  if (roomAllocation) {
    await addOption(
      options,
      input,
      stay,
      roomAllocation.map((allocation, index) => () =>
        toPricedRoomItem(
          allocation.room,
          allocation.guestCount,
          index,
          tenantId,
          input.comfortOption,
          stay,
          tx,
        ),
      ),
    );
  }

  for (const unit of unitsByCapacityDesc.filter(
    (candidate) => getUnitCapacity(candidate) < input.guests,
  )) {
    const remainingGuests = input.guests - getUnitCapacity(unit);
    const remainingRooms = roomsByGroup.filter(
      (room) => room.unitId !== unit.id,
    );
    const remainingRoomAllocation = buildRoomAllocation(
      remainingRooms,
      remainingGuests,
    );

    if (!remainingRoomAllocation) {
      continue;
    }

    await addOption(options, input, stay, [
      () =>
        toPricedUnitItem(
          unit,
          getUnitCapacity(unit),
          0,
          tenantId,
          input.comfortOption,
          stay,
          tx,
        ),
      ...remainingRoomAllocation.map((allocation, index) => () =>
        toPricedRoomItem(
          allocation.room,
          allocation.guestCount,
          index,
          tenantId,
          input.comfortOption,
          stay,
          tx,
        ),
      ),
    ]);
  }

  const deduped = new Map<string, PublicAvailabilityOptionInternal>();
  for (const option of options.sort((left, right) =>
    sortOptions(left, right, input.guests),
  )) {
    const key = [
      option.title,
      option.guestSplit,
      option.totalCapacity,
      option.comfortOption,
    ].join("|");
    const existing = deduped.get(key);
    if (!existing || option.nightlyTotal < existing.nightlyTotal) {
      deduped.set(key, option);
    }
  }

  return [...deduped.values()]
    .sort((left, right) => sortOptions(left, right, input.guests))
    .slice(0, maxPublicOptions);
};

export const getPublicAvailabilityOptions = async (
  input: CheckAvailabilityInput,
  tenantId: string,
  nights: number,
  tx?: Prisma.TransactionClient,
) => {
  const options = await generateAvailabilityOptions(input, tenantId, nights, tx);

  return options.map(mapOptionDTO);
};

export const findAvailabilityOptionById = async (
  optionId: string,
  input: CheckAvailabilityInput,
  tenantId: string,
  nights: number,
  tx?: Prisma.TransactionClient,
) => {
  const options = await generateAvailabilityOptions(input, tenantId, nights, tx);
  return options.find((option) => option.optionId === optionId) ?? null;
};
