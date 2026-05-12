import type {
  BookingStatus,
  BookingTargetType,
} from "@/generated/prisma/client.js";

export interface PublicTenantConfigDTO {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultCurrency: string;
  timezone: string;
}

export interface PublicSpaceDTO {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  location: string;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}

export interface PublicAvailabilitySpaceDTO {
  spaceId: string;
  title: string;
  location: string;
  priceTotal: number;
}

export interface PublicAvailabilityDTO {
  available: boolean;
  spaces: PublicAvailabilitySpaceDTO[];
}

export interface PublicBookingDTO {
  id: string;
  bookingRef: string;
  userId: string;
  spaceId: string;
  propertyId: string;
  title: string;
  spaceName: string;
  status: BookingStatus;
  guestName: string;
  guestEmail: string;
  guestContactNumber: string | null;
  from: string;
  to: string;
  pricePerNight: number;
  totalPrice: number;
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface PublicEnquiryDTO {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
  createdAt: string;
}
