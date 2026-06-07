import type {
  ComfortOption,
} from "@/generated/prisma/client.js";

export type PublicBookingType = "SINGLE_TARGET" | "MULTI_ROOM";

export interface CheckAvailabilityInput {
  checkIn: Date;
  checkOut: Date;
  guests: number;
  comfortOption: ComfortOption;
  city?: string;
}

export interface CreateInventoryLockInput {
  bookingType: PublicBookingType;
  bookingOptionId?: string;
  propertyId?: string;
  spaceId?: string;
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  comfortOption: ComfortOption;
}
