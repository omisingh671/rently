export type ComfortOption = "AC" | "NON_AC";
export type ComfortFilter = "ALL" | ComfortOption;
export type BookingTargetType = "UNIT" | "ROOM";
export type GalleryImageScope = "PROPERTY" | "UNIT" | "ROOM";

export interface AvailabilityCriteria {
  checkIn: string;
  checkOut: string;
  guests: number;
  comfortOption: ComfortFilter;
}

export interface AvailabilityOption {
  optionId: string;
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
  images: GalleryImage[];
  items: AvailabilityOptionItem[];
}

export interface AvailabilityResult {
  available: boolean;
  options: AvailabilityOption[];
}

export interface GalleryImage {
  id: string;
  url: string;
  scope: GalleryImageScope;
  propertyId: string;
  unitId: string | null;
  roomId: string | null;
  altText: string;
}

export interface AvailabilityAmenity {
  id: string;
  name: string;
  icon: string | null;
}

export interface AvailabilityOptionItem {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  label: string;
  guestCount: number;
  capacity: number;
  pricePerNight: number;
  images: GalleryImage[];
  amenities: AvailabilityAmenity[];
  rooms: AvailabilityOptionRoom[];
}

export interface AvailabilityOptionRoom {
  id: string;
  label: string;
  capacity: number;
  hasAC: boolean;
  amenities: AvailabilityAmenity[];
}
