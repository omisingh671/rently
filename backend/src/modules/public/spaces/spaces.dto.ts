import type {
  BookingTargetType,
  ComfortOption,
  AdvancePaymentType,
} from "@/generated/prisma/client.js";

export type PublicBookingPolicyRulesDTO = Record<string, unknown>;

export interface PublicBookingPolicyDTO {
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: number;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
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
