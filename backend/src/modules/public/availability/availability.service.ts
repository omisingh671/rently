import { createHmac, randomUUID } from "node:crypto";
import {
  BookingTargetType,
  ComfortOption,
  Prisma,
} from "@/generated/prisma/client.js";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";
import * as repo from "./availability.repository.js";
import * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import * as tenantService from "@/modules/public/tenant/tenant.service.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import type {
  CheckAvailabilityInput,
  CreateInventoryLockInput,
} from "./availability.inputs.js";
import type {
  PublicAvailabilityDTO,
  PublicAvailabilityOptionDTO,
  PublicInventoryLockDTO,
  GalleryImageDTO,
  GalleryImageScope,
  PublicAmenityDTO,
  AvailabilityOptionItemDTO,
  AvailabilityOptionRoomDTO,
} from "./availability.dto.js";
import type { TenantResolutionInput } from "@/modules/public/tenant/tenant.inputs.js";

const maxBookingTransactionAttempts = 3;
const inventoryLockTtlMs = 10 * 60 * 1000;
const maxPublicOptions = 10;
const publicRoomCapacityCap = 2;

const now = () => new Date();

const getNights = (checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, nights);
};

const isRetryableBookingTransactionError = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2034" || error.code === "P2002");

const getOptionPropertyScope = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
): spacesRepo.PublicPropertyScope => {
  const propertyId = baseScope.propertyId ?? requestedPropertyId;
  return propertyId === undefined ? baseScope : { ...baseScope, propertyId };
};

const getRequiredPropertyId = (
  baseScope: spacesRepo.PublicPropertyScope,
  requestedPropertyId?: string,
) => baseScope.propertyId ?? requestedPropertyId;

interface StayScope {
  checkIn: Date;
  checkOut: Date;
  nights: number;
}

export interface PublicInventoryItem {
  target: spacesRepo.PublicSpaceTarget;
  pricingId: string;
  propertyId: string;
  propertyLabel: string;
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
  propertyLabel: string;
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
  propertyId: option.propertyId,
  propertyLabel: option.propertyLabel,
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
  unitId: null,
  roomId: null,
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
  target: spacesRepo.PublicSpaceTarget,
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
  scope: spacesRepo.PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const rooms = await repo.listAvailabilityRooms(
    tenantId,
    comfortOption,
    scope,
    tx,
  );
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
  scope: spacesRepo.PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const units = await repo.listAvailabilityUnits(
    tenantId,
    comfortOption,
    scope,
    tx,
  );
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
    id: `room-${index + 1}`,
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
  scope: spacesRepo.PublicPropertyScope = {},
): Promise<PublicInventoryItem | null> => {
  const target = {
    targetType: BookingTargetType.ROOM,
    unitId: room.unitId,
    roomId: room.id,
  };
  const pricing = await spacesRepo.findActivePricingForTarget(
    target,
    new Date(),
    tenantId,
    {
      guestCount,
      comfortOption,
    },
    stay,
    tx,
    scope,
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
    propertyLabel: `${room.unit.property.name} \u2022 ${room.unit.property.city}`,
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
  scope: spacesRepo.PublicPropertyScope = {},
): Promise<PublicInventoryItem | null> => {
  const capacity = getUnitCapacity(unit);
  const target = {
    targetType: BookingTargetType.UNIT,
    unitId: unit.id,
    roomId: null,
  };
  const pricing = await spacesRepo.findActivePricingForTarget(
    target,
    new Date(),
    tenantId,
    {
      guestCount: capacity,
      comfortOption,
    },
    stay,
    tx,
    scope,
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
    propertyLabel: `${unit.property.name} \u2022 ${unit.property.city}`,
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
    propertyLabel: items[0]?.propertyLabel ?? "",
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
  scope: spacesRepo.PublicPropertyScope = {},
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
      scope,
      tx,
      ignoreLockToken,
    ),
    loadAvailableUnits(
      tenantId,
      input.comfortOption,
      stay,
      scope,
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
          scope,
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
          scope,
        ),
      ),
    );
  }

  for (let roomIndex = 0; roomIndex < roomsByGroup.length; roomIndex += 1) {
    const roomAllocation = buildRoomAllocation(
      roomsByGroup.slice(roomIndex),
      input.guests,
    );
    if (!roomAllocation) {
      continue;
    }

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
          scope,
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
          scope,
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
          scope,
        ),
      ),
    ]);
  }

  const deduped = new Map<string, PublicAvailabilityOptionInternal>();
  for (const option of options.sort((left, right) =>
    sortOptions(left, right, input.guests),
  )) {
    const key = [
      option.propertyId,
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
  scope: spacesRepo.PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
) => {
  const options = await generateAvailabilityOptions(
    input,
    tenantId,
    nights,
    scope,
    tx,
  );

  return options.map(mapOptionDTO);
};

export const findAvailabilityOptionById = async (
  optionId: string,
  input: CheckAvailabilityInput,
  tenantId: string,
  nights: number,
  scope: spacesRepo.PublicPropertyScope = {},
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const options = await generateAvailabilityOptions(
    input,
    tenantId,
    nights,
    scope,
    tx,
    ignoreLockToken,
  );
  return options.find((option) => option.optionId === optionId) ?? null;
};

export const ensureSpaceAvailable = async (
  space: spacesRepo.PublicSpaceRecord,
  checkIn: Date,
  checkOut: Date,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const target = spacesService.getSpaceTarget(space);
  const unit = space.unit ?? space.room?.unit;

  if (unit && (!unit.isActive || unit.status !== "ACTIVE")) {
    throw new HttpError(
      409,
      "UNIT_DISABLED",
      "The parent unit for this space is currently disabled or inactive",
    );
  }

  const at = now();
  const [hasBooking, hasMaintenance, hasLock] = await Promise.all([
    repo.hasOverlappingBooking(target, checkIn, checkOut, tx),
    repo.hasOverlappingMaintenance(
      space.propertyId,
      target,
      checkIn,
      checkOut,
      tx,
    ),
    repo.hasOverlappingInventoryLock(
      target,
      checkIn,
      checkOut,
      at,
      tx,
      ignoreLockToken,
    ),
  ]);

  if (hasBooking || hasMaintenance || hasLock) {
    throw new HttpError(
      409,
      "SPACE_NOT_AVAILABLE",
      "Selected space is not available for these dates",
    );
  }

  return target;
};

const getTargetKey = (target: spacesRepo.PublicSpaceTarget) =>
  target.targetType === BookingTargetType.ROOM
    ? `ROOM:${target.roomId ?? ""}`
    : `UNIT:${target.unitId ?? ""}`;

const getArrayItem = <T>(items: T[], index: number, message: string): T => {
  const item = items[index];
  if (item === undefined) {
    throw new HttpError(500, "BOOKING_INVARIANT_FAILED", message);
  }

  return item;
};

const resolveInventoryLockTargets = async (
  input: CreateInventoryLockInput,
  tenantId: string,
  nights: number,
  propertyScope: spacesRepo.PublicPropertyScope,
  tx: Prisma.TransactionClient,
) => {
  if (input.bookingOptionId !== undefined) {
    const optionPropertyScope = getOptionPropertyScope(
      propertyScope,
      input.propertyId,
    );
    const requiredPropertyId = getRequiredPropertyId(
      propertyScope,
      input.propertyId,
    );
    const option = await findAvailabilityOptionById(
      input.bookingOptionId,
      {
        checkIn: input.from,
        checkOut: input.to,
        guests: input.guests,
        comfortOption: input.comfortOption,
      },
      tenantId,
      nights,
      optionPropertyScope,
      tx,
    );

    if (!option) {
      throw new HttpError(
        409,
        "BOOKING_OPTION_UNAVAILABLE",
        "Selected booking option is no longer available",
      );
    }

    if (
      requiredPropertyId !== undefined &&
      option.propertyId !== requiredPropertyId
    ) {
      throw new HttpError(
        422,
        "BOOKING_PROPERTY_MISMATCH",
        "Selected option does not belong to the selected property",
      );
    }

    return {
      propertyId: option.propertyId,
      targets: option.items.map((item) => item.target),
    };
  }

  const selectedSpaces =
    input.bookingType === "MULTI_ROOM"
      ? await Promise.all(
          (input.spaceIds ?? []).map((spaceId) =>
            spacesRepo.findActiveSpaceById(
              spaceId,
              now(),
              tenantId,
              tx,
              {
                checkIn: input.from,
                checkOut: input.to,
                nights,
              },
              propertyScope,
            ),
          ),
        )
      : [
          await spacesRepo.findActiveSpaceById(
            input.spaceId ?? "",
            now(),
            tenantId,
            tx,
            {
              checkIn: input.from,
              checkOut: input.to,
              nights,
            },
            propertyScope,
          ),
        ];

  if (selectedSpaces.some((space) => !space)) {
    throw new HttpError(404, "SPACE_NOT_FOUND", "Space not found");
  }

  const resolvedSelectedSpaces = selectedSpaces.filter(
    (space): space is spacesRepo.PublicSpaceRecord => space !== null,
  );
  const targets = await Promise.all(
    resolvedSelectedSpaces.map((space) =>
      ensureSpaceAvailable(space, input.from, input.to, tx),
    ),
  );
  const uniqueTargetKeys = new Set(targets.map(getTargetKey));

  if (uniqueTargetKeys.size !== resolvedSelectedSpaces.length) {
    throw new HttpError(
      422,
      "DUPLICATE_BOOKING_SPACE",
      "Each selected space can only be held once",
    );
  }

  const propertyIds = new Set(
    resolvedSelectedSpaces.map((space) => space.propertyId),
  );

  if (propertyIds.size !== 1) {
    throw new HttpError(
      422,
      "MULTI_ROOM_PROPERTY_MISMATCH",
      "Multi-room holds must stay within one property",
    );
  }

  if (
    input.bookingType === "MULTI_ROOM" &&
    targets.some((target) => target.targetType !== BookingTargetType.ROOM)
  ) {
    throw new HttpError(
      422,
      "MULTI_ROOM_REQUIRES_ROOMS",
      "Multi-room bookings can only combine rooms",
    );
  }

  const selectedCapacity = resolvedSelectedSpaces.reduce(
    (total, space) => total + spacesService.getSpaceCapacity(space),
    0,
  );

  if (input.guests > selectedCapacity) {
    throw new HttpError(
      422,
      "INSUFFICIENT_CAPACITY",
      "Selected spaces do not cover the requested guest count",
    );
  }

  return {
    propertyId: getArrayItem(
      Array.from(propertyIds),
      0,
      "Missing lock property",
    ),
    targets,
  };
};

export const checkAvailability = async (
  input: CheckAvailabilityInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicAvailabilityDTO> => {
  const scope = await tenantService.resolvePublicScope({
    ...tenantInput,
    ...(input.city !== undefined && { city: input.city }),
  });
  const nights = getNights(input.checkIn, input.checkOut);
  const options = await getPublicAvailabilityOptions(
    input,
    scope.tenant.id,
    nights,
    scope.propertyScope,
  );

  return {
    available: options.length > 0,
    options,
  };
};

export const createInventoryLock = async (
  userId: string | undefined,
  input: CreateInventoryLockInput,
  tenantInput: TenantResolutionInput = {},
): Promise<PublicInventoryLockDTO> => {
  const scope = await tenantService.resolvePublicScope(tenantInput);
  const nights = getNights(input.from, input.to);
  const lockToken = randomUUID();
  const createdAt = now();
  const expiresAt = new Date(createdAt.getTime() + inventoryLockTtlMs);

  for (let attempt = 1; attempt <= maxBookingTransactionAttempts; attempt += 1) {
    try {
      await repo.runSerializableTransaction(async (tx) => {
        // Run transactional query execution using serializable wrapper
        await repo.cleanupExpiredInventoryLocks(createdAt, tx);
        const { propertyId, targets } = await resolveInventoryLockTargets(
          input,
          scope.tenant.id,
          nights,
          scope.propertyScope,
          tx,
        );

        await repo.createInventoryLocks(
          targets.map((target) => ({
            lockToken,
            propertyId,
            targetType: target.targetType,
            unitId: target.unitId,
            roomId: target.roomId,
            checkIn: input.from,
            checkOut: input.to,
            expiresAt,
            createdByUserId: userId ?? null,
            createdAt,
          })),
          tx,
        );
      });

      return {
        lockToken,
        expiresAt: expiresAt.toISOString(),
        ttlSeconds: inventoryLockTtlMs / 1000,
      };
    } catch (error) {
      if (
        attempt < maxBookingTransactionAttempts &&
        isRetryableBookingTransactionError(error)
      ) {
        continue;
      }

      if (isRetryableBookingTransactionError(error)) {
        throw new HttpError(
          409,
          "INVENTORY_LOCK_CONFLICT",
          "Selected space is no longer available for checkout",
        );
      }

      throw error;
    }
  }

  throw new HttpError(
    409,
    "INVENTORY_LOCK_CONFLICT",
    "Selected space is no longer available for checkout",
  );
};
