import type { ComfortOption } from "@/generated/prisma/client.js";
import type { PublicBookingType } from "@/modules/public/availability/availability.inputs.js";

export interface PublicBookingGuestDetailsInput {
  name: string;
  email: string;
  contactNumber: string;
}

export interface CreatePublicBookingInput {
  bookingType: PublicBookingType;
  bookingOptionId?: string;
  propertyId?: string;
  inventoryLockToken?: string;
  spaceId?: string;
  spaceIds?: string[];
  from: Date;
  to: Date;
  guests: number;
  comfortOption: ComfortOption;
  couponCode?: string | undefined;
  guestDetails?: PublicBookingGuestDetailsInput;
}

export type PublicBookingQuoteInput = Omit<
  CreatePublicBookingInput,
  "guestDetails"
>;

export interface PublicBookingCheckoutQuoteInput {
  couponCode?: string | null | undefined;
  editToken?: string | undefined;
}

export interface UpdatePublicBookingCheckoutInput extends PublicBookingCheckoutQuoteInput {
  guestDetails: PublicBookingGuestDetailsInput;
}
