import type {
  BookingPaymentPolicy,
  BookingType,
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
  payAtCheckInEnabled: boolean;
  bookingTokenAmount: number;
}

export interface PublicSpaceDTO {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  hasAC: boolean;
  location: string;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}

export interface PublicAvailabilitySpaceDTO {
  spaceId: string;
  title: string;
  location: string;
  capacity: number;
  pricePerNight: number;
  priceTotal: number;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}

export interface PublicAvailabilityDTO {
  available: boolean;
  spaces: PublicAvailabilitySpaceDTO[];
  groupCandidates: PublicAvailabilitySpaceDTO[];
}

export interface PublicBookingItemDTO {
  id: string;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  pricePerNight: number;
  totalAmount: number;
}

export interface PublicBookingDTO {
  id: string;
  bookingRef: string;
  userId: string;
  spaceId: string;
  propertyId: string;
  bookingType: BookingType;
  guestCount: number;
  title: string;
  spaceName: string;
  status: BookingStatus;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  guestName: string;
  guestEmail: string;
  guestContactNumber: string | null;
  from: string;
  to: string;
  pricePerNight: number;
  totalPrice: number;
  remainingPayAtCheckIn: number;
  items: PublicBookingItemDTO[];
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
  source: string | null;
  createdAt: string;
}
