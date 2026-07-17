import type { AdvancePaymentType } from "@/generated/prisma/enums.js";

export type BookingPolicyRulesDTO = Record<string, unknown>;

export interface DashboardBookingPolicyDTO {
  id: string;
  propertyId: string;
  version: number;
  advancePaymentType: AdvancePaymentType;
  advancePaymentValue: string;
  tokenRefundable: boolean;
  checkInTime: string;
  checkOutTime: string;
  pendingPaymentExpiryMinutes: number;
  cancellationRules: BookingPolicyRulesDTO;
  refundRules: BookingPolicyRulesDTO;
  earlyCheckInRules: BookingPolicyRulesDTO;
  earlyCheckoutRules: BookingPolicyRulesDTO;
  lateCheckoutRules: BookingPolicyRulesDTO;
  downgradeRules: BookingPolicyRulesDTO;
  noShowRules: BookingPolicyRulesDTO;
  guestPolicyText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingPolicyAuditDTO {
  id: string;
  propertyId: string;
  version: number;
  actor: { id: string; fullName: string; email: string };
  previousData: BookingPolicyRulesDTO;
  nextData: BookingPolicyRulesDTO;
  createdAt: Date;
}
