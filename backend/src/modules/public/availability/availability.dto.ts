import type {
  BookingTargetType,
  ComfortOption,
} from "@/generated/prisma/client.js";

export type GalleryImageScope = "PROPERTY" | "UNIT" | "ROOM";

export interface GalleryImageDTO {
  id: string;
  url: string;
  scope: GalleryImageScope;
  propertyId: string;
  unitId: string | null;
  roomId: string | null;
  altText: string;
}

export interface PublicAmenityDTO {
  id: string;
  name: string;
  icon: string | null;
}

export interface AvailabilityOptionRoomDTO {
  id: string;
  label: string;
  capacity: number;
  hasAC: boolean;
  amenities: PublicAmenityDTO[];
}

export interface AvailabilityOptionItemDTO {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  label: string;
  guestCount: number;
  priceGuestCount: number;
  capacity: number;
  pricePerNight: number;
  images: GalleryImageDTO[];
  amenities: PublicAmenityDTO[];
  rooms: AvailabilityOptionRoomDTO[];
}

export interface PublicAvailabilityOptionDTO {
  optionId: string;
  propertyId: string;
  propertyLabel: string;
  title: string;
  guestSplit: string;
  totalCapacity: number;
  comfortOption: ComfortOption;
  nightlyTotal: number;
  stayTotal: number;
  nights: number;
  itemCount: number;
  priceBreakup: number[];
  propertyImages: string[];
  images: GalleryImageDTO[];
  items: AvailabilityOptionItemDTO[];
}

export interface PublicAvailabilityDTO {
  available: boolean;
  options: PublicAvailabilityOptionDTO[];
}

export interface PublicInventoryLockDTO {
  lockToken: string;
  expiresAt: string;
  ttlSeconds: number;
}
