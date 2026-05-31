import type {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingType,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  AdvancePaymentType,
  TaxType,
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

export type PublicBookingPolicyRulesDTO = Record<string, unknown>;

export interface PublicBookingPolicyDTO {
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  cancellationRules: PublicBookingPolicyRulesDTO;
  refundRules: PublicBookingPolicyRulesDTO;
  earlyCheckoutRules: PublicBookingPolicyRulesDTO;
  noShowRules: PublicBookingPolicyRulesDTO;
  guestPolicyText: string;
}

export interface PublicSpaceDTO {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  pricePerNight: number;
  capacity: number;
  guestCount: number;
  hasAC: boolean;
  comfortOption: ComfortOption;
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
  comfortOption: ComfortOption;
  pricePerNight: number;
  priceTotal: number;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
}

export interface PublicAvailabilityOptionDTO {
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
  images: GalleryImageDTO[];
  items: AvailabilityOptionItemDTO[];
}

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

export interface AvailabilityOptionItemDTO {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  label: string;
  guestCount: number;
  capacity: number;
  pricePerNight: number;
  images: GalleryImageDTO[];
  amenities: PublicAmenityDTO[];
  rooms: AvailabilityOptionRoomDTO[];
}

export interface AvailabilityOptionRoomDTO {
  id: string;
  label: string;
  capacity: number;
  hasAC: boolean;
  amenities: PublicAmenityDTO[];
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

export interface PublicBookingItemDTO {
  id: string;
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  guestCount: number;
  comfortOption: ComfortOption;
  pricePerNight: number;
  pricingId: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: PublicTaxBreakdownDTO[];
  totalAmount: number;
  finalAmount: number;
}

export interface PublicTaxBreakdownDTO {
  taxId: string;
  name: string;
  taxType: TaxType;
  rate: number;
  appliesTo: string;
  itemId?: string;
  taxableAmount: number;
  taxAmount: number;
  included: boolean;
  isRefundable: boolean;
}

export interface PublicBookingQuoteItemDTO {
  targetType: BookingTargetType;
  unitId: string | null;
  roomId: string | null;
  productId: string | null;
  targetLabel: string;
  productName: string;
  capacity: number;
  guestCount: number;
  comfortOption: ComfortOption;
  pricePerNight: number;
  pricingId: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: PublicTaxBreakdownDTO[];
  totalAmount: number;
  finalAmount: number;
  taxInclusive: boolean;
}

export interface PublicBookingQuoteDTO {
  propertyId: string;
  bookingType: BookingType;
  nights: number;
  guestCount: number;
  comfortOption: ComfortOption;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentPolicy: BookingPaymentPolicy;
  upfrontAmount: number;
  remainingPayAtCheckIn: number;
  couponCode: string | null;
  taxBreakdown: PublicTaxBreakdownDTO[];
  items: PublicBookingQuoteItemDTO[];
  policy: PublicBookingPolicyDTO;
}

export interface PublicBookingDTO {
  id: string;
  bookingRef: string;
  userId: string;
  spaceId: string;
  propertyId: string;
  bookingType: BookingType;
  guestCount: number;
  comfortOption: ComfortOption;
  title: string;
  spaceName: string;
  status: BookingStatus;
  paymentPolicy: BookingPaymentPolicy;
  paymentStatus: BookingPaymentStatus;
  upfrontAmount: number;
  tokenPaidAmount: number;
  tokenPaymentStatus: "NOT_REQUIRED" | "UNPAID" | "PAID";
  guestName: string;
  guestEmail: string;
  guestContactNumber: string | null;
  from: string;
  to: string;
  pricePerNight: number;
  subtotalAmount: number;
  totalPrice: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxBreakdown: PublicTaxBreakdownDTO[];
  paidAmount: number;
  refundedAmount: number;
  netPaidAmount: number;
  refundableAmount: number;
  balanceAmount: number;
  remainingPayAtCheckIn: number;
  policy: PublicBookingPolicyDTO;
  items: PublicBookingItemDTO[];
  internalNotes: string | null;
  cancellationReason: string | null;
  cancelledAt: string | null;
  couponCode: string | null;
  refundRequest: {
    id: string;
    status: BookingRefundRequestStatus;
    reason: string;
    adminNote: string | null;
    reviewedAt: string | null;
    fulfilledAt: string | null;
    createdAt: string;
  } | null;
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
