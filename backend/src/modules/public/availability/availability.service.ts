import { createHmac, randomUUID } from "node:crypto";
import {
  BookingTargetType,
  Prisma,
} from "@/generated/prisma/client.js";
import { env } from "@/config/env.js";
import { HttpError } from "@/common/errors/http-error.js";
import { isTransientDatabaseError } from "@/common/retry/retry-policy.js";
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
  PublicInventoryLockDTO,
  GalleryImageDTO,
  GalleryImageScope,
  PublicAmenityDTO,
  AvailabilityOptionRoomDTO,
  PublicAvailabilityOptionType,
} from "./availability.dto.js";
import type {
  PublicAvailabilityOptionInternal,
  PublicInventoryItem,
} from "./availability.types.js";
import type { TenantResolutionInput } from "@/modules/public/tenant/tenant.inputs.js";
import {
  buildRoomAllocation,
  buildUnitAllocation,
  getRoomCapacity,
  getUnitCapacity,
} from "./availability.capacity.js";
import { ensureSpaceAvailable } from "./availability.conflicts.js";
import { mapAvailabilityOptionDTO } from "./availability.presenter.js";

export { ensureSpaceAvailable } from "./availability.conflicts.js";
export type {
  PublicAvailabilityOptionInternal,
  PublicInventoryItem,
} from "./availability.types.js";

const maxBookingTransactionAttempts = 3;
const inventoryLockTtlMs = 10 * 60 * 1000;
const maxPublicOptionsPerProperty = 8;

const now = () => new Date();

const getNights = (checkIn: Date, checkOut: Date) => {
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );

  return Math.max(1, nights);
};

const isRetryableBookingTransactionError = isTransientDatabaseError;

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

interface GenerateAvailabilityOptionsConfig {
  pricePrivateRoomsByCapacity?: boolean;
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

const formatCount = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

const occupancyNames = new Map<number, string>([
  [1, "Single"],
  [2, "Double"],
  [3, "Triple"],
]);

const getOccupancyName = (occupancy: number) =>
  occupancyNames.get(occupancy) ?? `${occupancy}-Guest`;

const getRoomPackageName = (priceGuestCount: number, formal = false) =>
  `${getOccupancyName(priceGuestCount)}${formal ? " Occupancy" : ""} Room`;

const countCompositionPart = (count: number, label: string) =>
  count === 1 ? `1 ${label}` : `${count} ${label}s`;

const titleCompositionPart = (count: number, label: string) =>
  count === 1 ? label : `${count} ${label}s`;

const getOptionType = (
  items: PublicInventoryItem[],
): PublicAvailabilityOptionType => {
  const units = items.filter(
    (item) => item.target.targetType === BookingTargetType.UNIT,
  ).length;
  const rooms = items.length - units;

  if (units > 0 && rooms > 0) return "UNIT_ROOM";
  if (units > 1) return "MULTI_UNIT";
  if (units === 1) return "UNIT";
  if (rooms > 1) return "MULTI_ROOM";
  return "ROOM";
};

const buildItemLabel = (items: PublicInventoryItem[]) => {
  const units = items.filter(
    (item) => item.target.targetType === BookingTargetType.UNIT,
  ).length;
  const rooms = items.length - units;
  const parts = [
    units > 0 ? formatCount(units, "unit", "units") : null,
    rooms > 0 ? formatCount(rooms, "room", "rooms") : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" + ");
};

const buildCompositionLabel = (items: PublicInventoryItem[]) => {
  const units = items.filter(
    (item) => item.target.targetType === BookingTargetType.UNIT,
  ).length;
  const roomGroups = new Map<number, number>();

  for (const item of items) {
    if (item.target.targetType === BookingTargetType.ROOM) {
      roomGroups.set(
        item.priceGuestCount,
        (roomGroups.get(item.priceGuestCount) ?? 0) + 1,
      );
    }
  }

  const parts = [
    units > 0 ? countCompositionPart(units, "Whole Apartment") : null,
    ...[...roomGroups.entries()]
      .sort(([leftOccupancy], [rightOccupancy]) => rightOccupancy - leftOccupancy)
      .map(([occupancy, count]) =>
        countCompositionPart(count, getRoomPackageName(occupancy)),
      ),
  ].filter((part): part is string => part !== null);

  return parts.join(" + ");
};

const buildTitleCompositionLabel = (items: PublicInventoryItem[]) => {
  const units = items.filter(
    (item) => item.target.targetType === BookingTargetType.UNIT,
  ).length;
  const roomGroups = new Map<number, number>();

  for (const item of items) {
    if (item.target.targetType === BookingTargetType.ROOM) {
      roomGroups.set(
        item.priceGuestCount,
        (roomGroups.get(item.priceGuestCount) ?? 0) + 1,
      );
    }
  }

  const hasPluralGroup =
    units > 1 || [...roomGroups.values()].some((count) => count > 1);
  const parts = [
    units > 0
      ? hasPluralGroup
        ? countCompositionPart(units, "Whole Apartment")
        : titleCompositionPart(units, "Whole Apartment")
      : null,
    ...[...roomGroups.entries()]
      .sort(([leftOccupancy], [rightOccupancy]) => rightOccupancy - leftOccupancy)
      .map(([occupancy, count]) =>
        hasPluralGroup
          ? countCompositionPart(count, getRoomPackageName(occupancy))
          : titleCompositionPart(count, getRoomPackageName(occupancy)),
      ),
  ].filter((part): part is string => part !== null);

  return parts.join(" + ");
};

const buildTitle = (items: PublicInventoryItem[]) => {
  const optionType = getOptionType(items);
  const firstItem = items[0];

  if (
    optionType === "ROOM" &&
    firstItem?.target.targetType === BookingTargetType.ROOM
  ) {
    return getRoomPackageName(firstItem.priceGuestCount, true);
  }

  if (optionType === "UNIT") {
    return "Whole Apartment";
  }

  return buildTitleCompositionLabel(items);
};

const buildRecommendationTags = (
  optionType: PublicAvailabilityOptionType,
  spareCapacity: number,
) => {
  const tags = [];

  if (spareCapacity === 0) {
    tags.push("Best fit");
  }

  if (optionType === "UNIT" || optionType === "UNIT_ROOM") {
    tags.push("Whole apartment");
  }

  if (spareCapacity >= 2) {
    tags.push("More spacious");
  }

  return tags;
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
      priceGuestCount: item.priceGuestCount,
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

const optionRank = (
  option: PublicAvailabilityOptionInternal,
  requestedGuests: number,
) => {
  const capacityFit = Math.max(0, option.totalCapacity - requestedGuests);
  const unitGroups = new Set(
    option.items.map((item) => item.unitId).filter(Boolean),
  ).size;
  const floorGroups = new Set(
    option.items.map((item) => item.floor).filter((floor) => floor !== null),
  ).size;

  const wholeApartmentPromotion =
    option.optionType === "UNIT" && capacityFit <= 2 ? 0 : 1;

  return {
    capacityFit,
    nightlyTotal: option.nightlyTotal,
    itemCount: option.itemCount,
    wholeApartmentPromotion,
    grouping: unitGroups + floorGroups,
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
    leftRank.nightlyTotal - rightRank.nightlyTotal ||
    leftRank.itemCount - rightRank.itemCount ||
    leftRank.wholeApartmentPromotion - rightRank.wholeApartmentPromotion ||
    leftRank.grouping - rightRank.grouping
  );
};

const getPublicOptionShapeKey = (option: PublicAvailabilityOptionInternal) =>
  [
    option.propertyId,
    option.comfortOption,
    option.guestSplit,
    option.nightlyTotal,
    option.items
      .map((item) =>
        [
          item.target.targetType,
          item.productId,
          item.guestCount,
          item.priceGuestCount,
          item.pricePerNight,
        ].join(":"),
      )
      .sort()
      .join("+"),
  ].join("|");

const curatePublicOptions = (
  options: PublicAvailabilityOptionInternal[],
  requestedGuests: number,
) => {
  const deduped = new Map<string, PublicAvailabilityOptionInternal>();

  for (const option of options) {
    const key = getPublicOptionShapeKey(option);
    const existing = deduped.get(key);
    if (!existing || sortOptions(option, existing, requestedGuests) < 0) {
      deduped.set(key, option);
    }
  }

  const byProperty = new Map<string, PublicAvailabilityOptionInternal[]>();

  for (const option of deduped.values()) {
    const propertyOptions = byProperty.get(option.propertyId) ?? [];
    propertyOptions.push(option);
    byProperty.set(option.propertyId, propertyOptions);
  }

  return [...byProperty.values()]
    .flatMap((propertyOptions) =>
      propertyOptions
        .sort((left, right) => sortOptions(left, right, requestedGuests))
        .slice(0, maxPublicOptionsPerProperty),
    )
    .sort((left, right) => sortOptions(left, right, requestedGuests));
};

const conflictKey = (propertyId: string, targetId: string) =>
  `${propertyId}:${targetId}`;

const filterAvailableInventory = async (
  rooms: repo.PublicAvailabilityRoomRecord[],
  units: repo.PublicAvailabilityUnitRecord[],
  stay: StayScope,
  tx?: Prisma.TransactionClient,
  ignoreLockToken?: string,
) => {
  const propertyIds = Array.from(
    new Set([
      ...rooms.map((room) => room.unit.propertyId),
      ...units.map((unit) => unit.propertyId),
    ]),
  );
  if (propertyIds.length === 0) return { rooms: [], units: [] };

  const [bookingItems, maintenanceBlocks, inventoryLocks] =
    await repo.listAvailabilityConflicts(
      propertyIds,
      stay.checkIn,
      stay.checkOut,
      now(),
      tx,
      ignoreLockToken,
    );
  const blockedProperties = new Set<string>();
  const blockedRooms = new Set<string>();
  const blockedUnitsForRoom = new Set<string>();
  const blockedUnitsForUnit = new Set<string>();
  const addTargetConflict = (input: {
    propertyId: string;
    targetType: string;
    unitId: string | null;
    roomId: string | null;
  }) => {
    if (input.targetType === "PROPERTY") {
      blockedProperties.add(input.propertyId);
      return;
    }
    if (input.targetType === BookingTargetType.UNIT && input.unitId) {
      const key = conflictKey(input.propertyId, input.unitId);
      blockedUnitsForRoom.add(key);
      blockedUnitsForUnit.add(key);
      return;
    }
    if (input.roomId) {
      blockedRooms.add(conflictKey(input.propertyId, input.roomId));
    }
    if (input.unitId) {
      blockedUnitsForUnit.add(conflictKey(input.propertyId, input.unitId));
    }
  };

  for (const item of bookingItems) {
    addTargetConflict({
      propertyId: item.booking.propertyId,
      targetType: item.targetType,
      unitId: item.unitId,
      roomId: item.roomId,
    });
  }
  for (const block of maintenanceBlocks) addTargetConflict(block);
  for (const lock of inventoryLocks) addTargetConflict(lock);

  return {
    rooms: rooms.filter((room) => {
      const propertyId = room.unit.propertyId;
      return (
        !blockedProperties.has(propertyId) &&
        !blockedUnitsForRoom.has(conflictKey(propertyId, room.unitId)) &&
        !blockedRooms.has(conflictKey(propertyId, room.id))
      );
    }),
    units: units.filter(
      (unit) =>
        getUnitCapacity(unit) > 0 &&
        !blockedProperties.has(unit.propertyId) &&
        !blockedUnitsForUnit.has(conflictKey(unit.propertyId, unit.id)),
    ),
  };
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

const selectPricingCandidate = (
  candidates: spacesRepo.PublicSpaceRecord[],
  propertyId: string,
  target: spacesRepo.PublicSpaceTarget,
  guestCount: number,
) =>
  candidates
    .filter((candidate) => {
      if (
        candidate.propertyId !== propertyId ||
        candidate.product.occupancy !== guestCount
      ) {
        return false;
      }
      if (target.targetType === BookingTargetType.ROOM) {
        return (
          candidate.roomId === target.roomId ||
          (candidate.roomId === null && candidate.unitId === target.unitId) ||
          (candidate.roomId === null && candidate.unitId === null)
        );
      }
      return (
        (candidate.roomId === null && candidate.unitId === target.unitId) ||
        (candidate.roomId === null && candidate.unitId === null)
      );
    })
    .sort((left, right) => {
      const rank = (candidate: spacesRepo.PublicSpaceRecord) =>
        candidate.roomId !== null ? 0 : candidate.unitId !== null ? 1 : 2;
      return rank(left) - rank(right) || Number(left.price) - Number(right.price);
    })[0] ?? null;

const toPricedRoomItem = async (
  room: repo.PublicAvailabilityRoomRecord,
  guestCount: number,
  priceGuestCount: number,
  _index: number,
  pricingCandidates: spacesRepo.PublicSpaceRecord[],
): Promise<PublicInventoryItem | null> => {
  const target = {
    targetType: BookingTargetType.ROOM,
    unitId: room.unitId,
    roomId: room.id,
  };
  const pricing = selectPricingCandidate(
    pricingCandidates,
    room.unit.propertyId,
    target,
    priceGuestCount,
  );

  if (!pricing) {
    return null;
  }
  const images = getInventoryImages(
    room.unit.property.galleries,
    room.unitId,
    room.id,
  );
  const publicLabel = getRoomPackageName(priceGuestCount);

  return {
    target,
    pricingId: pricing.id,
    propertyId: room.unit.propertyId,
    propertyLabel: `${room.unit.property.name} \u2022 ${room.unit.property.city}`,
    unitId: room.unitId,
    floor: room.unit.floor,
    capacity: getRoomCapacity(room),
    guestCount,
    priceGuestCount,
    pricePerNight: Number(pricing.price),
    taxInclusive: pricing.taxInclusive,
    productId: pricing.productId,
    productName: pricing.product.name,
    targetLabel: publicLabel,
    publicLabel,
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
  _index: number,
  pricingCandidates: spacesRepo.PublicSpaceRecord[],
): Promise<PublicInventoryItem | null> => {
  const capacity = getUnitCapacity(unit);
  const target = {
    targetType: BookingTargetType.UNIT,
    unitId: unit.id,
    roomId: null,
  };
  const pricing = selectPricingCandidate(
    pricingCandidates,
    unit.propertyId,
    target,
    capacity,
  );

  if (!pricing) {
    return null;
  }
  const images = getInventoryImages(
    unit.property.galleries,
    unit.id,
    null,
  );
  const publicLabel = "Whole Apartment";

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
    targetLabel: publicLabel,
    publicLabel,
    propertyImages: images.map((image) => image.url),
    images,
    amenities: mapAmenityLinks(unit.amenities),
    rooms: mapUnitRooms(unit),
  };
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
  const guestSplitParts = items.map((item) => item.guestCount);
  const optionType = getOptionType(items);
  const spareCapacity = Math.max(0, totalCapacity - input.guests);
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
    guestSplit: guestSplitParts.join(" + "),
    guestSplitParts,
    optionType,
    requestedGuests: input.guests,
    totalCapacity,
    spareCapacity,
    itemLabel: buildItemLabel(items),
    includedLabel: buildCompositionLabel(items),
    recommendationTags: buildRecommendationTags(optionType, spareCapacity),
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
  config: GenerateAvailabilityOptionsConfig = {},
): Promise<PublicAvailabilityOptionInternal[]> => {
  const pricePrivateRoomsByCapacity =
    config.pricePrivateRoomsByCapacity ?? true;
  const stay = {
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
  };
  const [candidateRooms, candidateUnits, pricingCandidates] = await Promise.all([
    repo.listAvailabilityRooms(
      tenantId,
      input.comfortOption,
      scope,
      tx,
    ),
    repo.listAvailabilityUnits(
      tenantId,
      input.comfortOption,
      scope,
      tx,
    ),
    spacesRepo.listActivePricingCandidates(
      now(),
      tenantId,
      input.comfortOption,
      stay,
      tx,
      scope,
    ),
  ]);
  const { rooms, units } = await filterAvailableInventory(
    candidateRooms,
    candidateUnits,
    stay,
    tx,
    ignoreLockToken,
  );
  const options: PublicAvailabilityOptionInternal[] = [];

  const groupRoomsByProperty = new Map<
    string,
    repo.PublicAvailabilityRoomRecord[]
  >();
  const groupUnitsByProperty = new Map<
    string,
    repo.PublicAvailabilityUnitRecord[]
  >();

  for (const room of rooms) {
    const propertyRooms = groupRoomsByProperty.get(room.unit.propertyId) ?? [];
    propertyRooms.push(room);
    groupRoomsByProperty.set(room.unit.propertyId, propertyRooms);
  }

  for (const unit of units) {
    const propertyUnits = groupUnitsByProperty.get(unit.propertyId) ?? [];
    propertyUnits.push(unit);
    groupUnitsByProperty.set(unit.propertyId, propertyUnits);
  }

  const unitsByCapacityAsc = [...units].sort(
    (left, right) => getUnitCapacity(left) - getUnitCapacity(right),
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
          pricingCandidates,
      ),
    ]);
  }

  for (const propertyUnits of groupUnitsByProperty.values()) {
    const propertyUnitsByCapacityDesc = [...propertyUnits].sort(
      (left, right) => getUnitCapacity(right) - getUnitCapacity(left),
    );
    const multiUnitAllocation = buildUnitAllocation(
      propertyUnitsByCapacityDesc,
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
            pricingCandidates,
          ),
        ),
      );
    }
  }

  for (const propertyRooms of groupRoomsByProperty.values()) {
    const roomsByGroup = [...propertyRooms].sort(
      (left, right) =>
        left.unitId.localeCompare(right.unitId) ||
        left.unit.floor - right.unit.floor ||
        right.maxOccupancy - left.maxOccupancy ||
        left.number.localeCompare(right.number),
    );

    for (let roomIndex = 0; roomIndex < roomsByGroup.length; roomIndex += 1) {
      const roomAllocation = buildRoomAllocation(
        roomsByGroup.slice(roomIndex),
        input.guests,
      );
      if (!roomAllocation) {
        continue;
      }

      const firstRoomAllocation = roomAllocation[0];

      if (
        roomAllocation.length === 1 &&
        pricePrivateRoomsByCapacity &&
        firstRoomAllocation !== undefined &&
        firstRoomAllocation.guestCount < getRoomCapacity(firstRoomAllocation.room)
      ) {
        await addOption(options, input, stay, [
          () =>
            toPricedRoomItem(
              firstRoomAllocation.room,
              firstRoomAllocation.guestCount,
              firstRoomAllocation.guestCount,
              0,
              pricingCandidates,
            ),
        ]);
      }

      await addOption(
        options,
        input,
        stay,
        roomAllocation.map((allocation, index) => {
          const isSinglePrivateRoomOption = roomAllocation.length === 1;

          return () =>
            toPricedRoomItem(
              allocation.room,
              allocation.guestCount,
              isSinglePrivateRoomOption && pricePrivateRoomsByCapacity
                ? getRoomCapacity(allocation.room)
                : allocation.guestCount,
              index,
              pricingCandidates,
            );
        }),
      );
    }
  }

  for (const unit of units
    .filter((candidate) => getUnitCapacity(candidate) < input.guests)
    .sort((left, right) => getUnitCapacity(right) - getUnitCapacity(left))) {
    const remainingGuests = input.guests - getUnitCapacity(unit);
    const remainingRooms = (groupRoomsByProperty.get(unit.propertyId) ?? [])
      .filter((room) => room.unitId !== unit.id)
      .sort(
        (left, right) =>
          left.unitId.localeCompare(right.unitId) ||
          left.unit.floor - right.unit.floor ||
          right.maxOccupancy - left.maxOccupancy ||
          left.number.localeCompare(right.number),
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
          pricingCandidates,
        ),
      ...remainingRoomAllocation.map((allocation, index) => () =>
        toPricedRoomItem(
          allocation.room,
          allocation.guestCount,
          allocation.guestCount,
          index,
          pricingCandidates,
        ),
      ),
    ]);
  }

  return curatePublicOptions(options, input.guests);
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

  return options.map(mapAvailabilityOptionDTO);
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
