import type { ComfortOption } from "@/generated/prisma/client.js";
import type * as spacesRepo from "@/modules/public/spaces/spaces.repository.js";
import type {
  AvailabilityOptionRoomDTO,
  GalleryImageDTO,
  PublicAmenityDTO,
  PublicAvailabilityOptionType,
} from "./availability.dto.js";

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
  guestSplitParts: number[];
  optionType: PublicAvailabilityOptionType;
  requestedGuests: number;
  totalCapacity: number;
  spareCapacity: number;
  itemLabel: string;
  includedLabel: string;
  recommendationTags: string[];
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
