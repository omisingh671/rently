import type { BookingTargetType } from "@/generated/prisma/client.js";

export interface CheckAvailabilityInput {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  occupancyType: "single" | "double";
}

export interface CreatePublicBookingInput {
  spaceId: string;
  from: Date;
  to: Date;
}

export interface CreatePublicEnquiryInput {
  tenantId?: string;
  propertyId?: string;
  name: string;
  email: string;
  contactNumber: string;
  message: string;
}

export interface TenantResolutionInput {
  tenantSlug?: string;
  host?: string;
}

export interface PublicSpaceTarget {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}
