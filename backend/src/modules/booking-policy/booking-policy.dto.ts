import type { AdvancePaymentType } from "@/generated/prisma/enums.js";

export type BookingPolicyRulesDTO = Record<string, unknown>;

export interface DashboardBookingPolicyDTO {
  id: string;
  propertyId: string;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  cancellationRules: BookingPolicyRulesDTO;
  refundRules: BookingPolicyRulesDTO;
  earlyCheckoutRules: BookingPolicyRulesDTO;
  noShowRules: BookingPolicyRulesDTO;
  guestPolicyText: string;
  createdAt: Date;
  updatedAt: Date;
}
