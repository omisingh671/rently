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
import type {
  AvailabilityOptionItemDTO,
  AvailabilityOptionRoomDTO,
  GalleryImageDTO,
  GalleryImageScope,
  PublicAmenityDTO,
  PublicAvailabilityOptionDTO,
} from "./public.dto.js";
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
  pricingId: string;
  propertyId: string;
  unitId: string | null;
  floor: number | null;
  capacity: number;
  guestCount: number;
  priceGuestCount: number;
  pricePerNight: number;
  taxInclusive: boolean;
  productId: string;
  productName: string;
  targetLabel: string;
  publicLabel: string;
  propertyImages: string[];
  images: GalleryImageDTO[];
  amenities: PublicAmenityDTO[];
  rooms: AvailabilityOptionRoomDTO[];
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
  propertyImages: string[];
  images: GalleryImageDTO[];
}

type GallerySource = {
  id: string;
  propertyId: string;
  unitId: string | null;
  roomId: string | null;
  url: string;
};

type AmenityLinkSource = {
  amenity: {
    id: string;
    name: string;
    icon: string | null;
  };
};

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
      taxInclusive: item.taxInclusive,
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
  priceBreakup: option.items.map((item) => item.pricePerNight),
  propertyImages: option.propertyImages,
  images: option.images,
  items: option.items.map(mapOptionItemDTO),
});

const mapOptionItemDTO = (
  item: PublicInventoryItem,
): AvailabilityOptionItemDTO => ({
  targetType: item.target.targetType,
  unitId: item.target.unitId,
  roomId: item.target.roomId,
  label: item.publicLabel,
  guestCount: item.guestCount,
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  images: item.images,
  amenities: item.amenities,
  rooms: item.rooms,
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
  ignoreLockToken?: string,
) => {
  const at = new Date();
  const [hasBooking, hasMaintenance, hasLock] = await Promise.all([
    repo.hasOverlappingBooking(target, stay.checkIn, stay.checkOut, tx),
    repo.hasOverlappingMaintenance(
      propertyId,
      target,
      stay.checkIn,
      stay.checkOut,
      tx,
    ),
    repo.hasOverlappingInventoryLock(
      target,
      stay.checkIn,
      stay.checkOut,
      at,
      tx,
      ignoreLockToken,
    ),
  ]);

  return hasBooking || hasMaintenance || hasLock;
};

const loadAvailableRooms = async (
  tenantId: string,
  comfortOption: ComfortOption,
  stay: StayScope,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
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
      !(await hasInventoryOverlap(
        room.unit.propertyId,
        target,
        stay,
        tx,
        ignoreLockToken,
      ))
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
  ignoreLockToken?: string,
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
      !(await hasInventoryOverlap(
        unit.propertyId,
        target,
        stay,
        tx,
        ignoreLockToken,
      ))
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

const getGalleryScope = (gallery: GallerySource): GalleryImageScope => {
  if (gallery.roomId) {
    return "ROOM";
  }

  if (gallery.unitId) {
    return "UNIT";
  }

  return "PROPERTY";
};

const mapGalleryImage = (gallery: GallerySource): GalleryImageDTO => {
  const scope = getGalleryScope(gallery);

  return {
    id: gallery.id,
    url: gallery.url,
    scope,
    propertyId: gallery.propertyId,
    unitId: gallery.unitId,
    roomId: gallery.roomId,
    altText:
      scope === "ROOM"
        ? "Room image"
        : scope === "UNIT"
          ? "Unit image"
          : "Property image",
  };
};

const getInventoryImages = (
  galleries: GallerySource[],
  targetUnitId: string | null,
  targetRoomId: string | null,
): GalleryImageDTO[] => {
  if (targetRoomId) {
    const roomImages = galleries
      .filter((gallery) => gallery.roomId === targetRoomId)
      .map(mapGalleryImage);
    if (roomImages.length > 0) return roomImages;
  }

  if (targetUnitId) {
    const unitImages = galleries
      .filter((gallery) => gallery.unitId === targetUnitId && !gallery.roomId)
      .map(mapGalleryImage);
    if (unitImages.length > 0) return unitImages;
  }

  const propertyImages = galleries
    .filter((gallery) => !gallery.unitId && !gallery.roomId)
    .map(mapGalleryImage);
  if (propertyImages.length > 0) return propertyImages;

  return galleries.map(mapGalleryImage);
};

const mapAmenityLinks = (links: AmenityLinkSource[]): PublicAmenityDTO[] =>
  links.map((link) => ({
    id: link.amenity.id,
    name: link.amenity.name,
    icon: link.amenity.icon ?? null,
  }));

const mergeAmenities = (...groups: PublicAmenityDTO[][]): PublicAmenityDTO[] => {
  const amenities = new Map<string, PublicAmenityDTO>();

  for (const group of groups) {
    for (const amenity of group) {
      amenities.set(amenity.id, amenity);
    }
  }

  return [...amenities.values()];
};

const mapUnitRooms = (
  unit: repo.PublicAvailabilityUnitRecord,
): AvailabilityOptionRoomDTO[] =>
  unit.rooms.map((room, index) => ({
    id: room.id,
    label: `Room ${index + 1}`,
    capacity: getRoomCapacity(room),
    hasAC: room.hasAC,
    amenities: mergeAmenities(
      mapAmenityLinks(room.amenities),
      mapAmenityLinks(unit.amenities),
    ),
  }));

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
  const images = getInventoryImages(
    room.unit.property.galleries,
    room.unitId,
    room.id,
  );

  return {
    target,
    pricingId: pricing.id,
    propertyId: room.unit.propertyId,
    unitId: room.unitId,
    floor: room.unit.floor,
    capacity: getRoomCapacity(room),
    guestCount,
    priceGuestCount: guestCount,
    pricePerNight: Number(pricing.price),
    taxInclusive: pricing.taxInclusive,
    productId: pricing.productId,
    productName: pricing.product.name,
    targetLabel: `Room ${index + 1}`,
    publicLabel: `Room ${index + 1}`,
    propertyImages: images.map((image) => image.url),
    images,
    amenities: mergeAmenities(
      mapAmenityLinks(room.amenities),
      mapAmenityLinks(room.unit.amenities),
    ),
    rooms: [],
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
  const images = getInventoryImages(
    unit.property.galleries,
    unit.id,
    null,
  );

  return {
    target,
    pricingId: pricing.id,
    propertyId: unit.propertyId,
    unitId: unit.id,
    floor: unit.floor,
    capacity,
    guestCount,
    priceGuestCount: capacity,
    pricePerNight: Number(pricing.price),
    taxInclusive: pricing.taxInclusive,
    productId: pricing.productId,
    productName: pricing.product.name,
    targetLabel: `Unit ${index + 1}`,
    publicLabel: `Unit ${index + 1}`,
    propertyImages: images.map((image) => image.url),
    images,
    amenities: mapAmenityLinks(unit.amenities),
    rooms: mapUnitRooms(unit),
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
  const imagesById = new Map<string, GalleryImageDTO>();
  for (const item of items) {
    for (const image of item.images) {
      imagesById.set(image.id, image);
    }
  }
  const images = [...imagesById.values()];

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
    propertyImages: images.map((image) => image.url),
    images,
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
  ignoreLockToken?: string,
): Promise<PublicAvailabilityOptionInternal[]> => {
  const stay = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
  };
  const [rooms, units] = await Promise.all([
    loadAvailableRooms(
      tenantId,
      input.comfortOption,
      stay,
      tx,
      ignoreLockToken,
    ),
    loadAvailableUnits(
      tenantId,
      input.comfortOption,
      stay,
      tx,
      ignoreLockToken,
    ),
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
  ignoreLockToken?: string,
) => {
  const options = await generateAvailabilityOptions(
    input,
    tenantId,
    nights,
    tx,
    ignoreLockToken,
  );
  return options.find((option) => option.optionId === optionId) ?? null;
};
