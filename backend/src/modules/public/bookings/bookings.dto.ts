import type {
  BookingPaymentPolicy,
  BookingPaymentStatus,
  BookingRefundRequestStatus,
  BookingType,
  BookingStatus,
  BookingTargetType,
  ComfortOption,
  TaxType,
} from "@/generated/prisma/client.js";
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";

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
