import type {
  BookingTargetType,
  ComfortOption,
} from "@/generated/prisma/client.js";

export type PublicOccupancyType = "single" | "double" | "unit" | "multi_room";
export type PublicBookingType = "SINGLE_TARGET" | "MULTI_ROOM";

export interface CheckAvailabilityInput {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  comfortOption: ComfortOption;
}

export interface CreatePublicBookingInput {
  bookingType: PublicBookingType;
  bookingOptionId?: string;
  spaceId?: string;
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  comfortOption: ComfortOption;
  guestDetails?: PublicBookingGuestDetailsInput;
}

export interface PublicBookingGuestDetailsInput {
  name: string;
  email: string;
  contactNumber: string;
}

export interface CreatePublicEnquiryInput {
  tenantId?: string;
  propertyId?: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  source?: "PUBLIC_WEBSITE" | "PUBLIC_QUOTE_REQUEST";
}

export interface TenantResolutionInput {
  tenantId?: string;
  tenantSlug?: string;
  host?: string;
}

export interface PublicSpaceTarget {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}
