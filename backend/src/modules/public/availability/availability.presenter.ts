import type {
  AvailabilityOptionItemDTO,
  PublicAvailabilityOptionDTO,
} from "./availability.dto.js";
import type {
  PublicAvailabilityOptionInternal,
  PublicInventoryItem,
} from "./availability.types.js";

const mapAvailabilityOptionItemDTO = (
  item: PublicInventoryItem,
): AvailabilityOptionItemDTO => ({
  targetType: item.target.targetType,
  unitId: null,
  roomId: null,
  label: item.publicLabel,
  productName: item.productName,
  guestCount: item.guestCount,
  priceGuestCount: item.priceGuestCount,
  capacity: item.capacity,
  pricePerNight: item.pricePerNight,
  images: item.images,
  amenities: item.amenities,
  rooms: item.rooms,
});

export const mapAvailabilityOptionDTO = (
  option: PublicAvailabilityOptionInternal,
): PublicAvailabilityOptionDTO => ({
  optionId: option.optionId,
  propertyId: option.propertyId,
  propertyLabel: option.propertyLabel,
  title: option.title,
  guestSplit: option.guestSplit,
  guestSplitParts: option.guestSplitParts,
  optionType: option.optionType,
  requestedGuests: option.requestedGuests,
  totalCapacity: option.totalCapacity,
  spareCapacity: option.spareCapacity,
  itemLabel: option.itemLabel,
  includedLabel: option.includedLabel,
  recommendationTags: option.recommendationTags,
  comfortOption: option.comfortOption,
  nightlyTotal: option.nightlyTotal,
  stayTotal: option.stayTotal,
  nights: option.nights,
  itemCount: option.itemCount,
  priceBreakup: option.items.map((item) => item.pricePerNight),
  priceBreakdown: option.items.map((item) => ({
    label: item.publicLabel,
    productName: item.productName,
    targetType: item.target.targetType,
    guestCount: item.guestCount,
    capacity: item.capacity,
    priceGuestCount: item.priceGuestCount,
    pricePerNight: item.pricePerNight,
  })),
  propertyImages: option.propertyImages,
  images: option.images,
  items: option.items.map(mapAvailabilityOptionItemDTO),
});
