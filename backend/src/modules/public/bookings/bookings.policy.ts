import { AdvancePaymentType, BookingStatus, Prisma } from "@/generated/prisma/client.js";
import { parsePolicySnapshot } from "@/modules/booking-policy/booking-policy.policy.js";
import type { PublicBookingPolicyDTO } from "@/modules/public/spaces/spaces.dto.js";
import * as spacesService from "@/modules/public/spaces/spaces.service.js";
import type * as repo from "./bookings.repository.js";
import {
  getNonRefundableTokenAmount,
  getPaidAmount,
  getRefundedAmount,
} from "./bookings.financials.js";

export interface PublicBookingPolicyPreviewDTO {
  bookingId: string;
  status: BookingStatus;
  paidAmount: number;
  refundedAmount: number;
  refundableAmount: number;
  nonRefundableAmount: number;
  tokenRefundable: boolean;
  guestPolicyText: string;
}

export const mapSnapshotPolicy = (
  propertyId: string,
  snapshot: Record<string, unknown>,
): PublicBookingPolicyDTO => ({
  propertyId,
  advancePaymentType: snapshot.advancePaymentType as AdvancePaymentType,
  advancePaymentValue: Number(snapshot.advancePaymentValue),
  tokenRefundable: Boolean(snapshot.tokenRefundable),
  checkInTime: "12:00",
  checkOutTime: "11:00",
  cancellationRules: snapshot.cancellationRules as Record<string, unknown>,
  refundRules: snapshot.refundRules as Record<string, unknown>,
  earlyCheckoutRules: snapshot.earlyCheckoutRules as Record<string, unknown>,
  noShowRules: snapshot.noShowRules as Record<string, unknown>,
  guestPolicyText: String(snapshot.guestPolicyText),
});

export const getBookingPolicyDto = async (
  booking: Pick<repo.PublicBookingRecord, "propertyId" | "policySnapshot">,
  tx?: Prisma.TransactionClient,
): Promise<PublicBookingPolicyDTO> => {
  const snapshot = parsePolicySnapshot(booking.policySnapshot);
  if (snapshot !== null) {
    const currentPolicy = await spacesService.ensureBookingPolicy(
      booking.propertyId,
      tx,
    );
    return {
      ...mapSnapshotPolicy(
        booking.propertyId,
        snapshot as unknown as Record<string, unknown>,
      ),
      checkInTime: currentPolicy.checkInTime,
      checkOutTime: currentPolicy.checkOutTime,
    };
  }

  return spacesService.mapPolicy(
    await spacesService.ensureBookingPolicy(booking.propertyId, tx),
  );
};

export const buildBookingPolicyPreview = async (
  booking: repo.PublicBookingRecord,
): Promise<PublicBookingPolicyPreviewDTO> => {
  const policy = await getBookingPolicyDto(booking);
  const paidAmount = getPaidAmount(booking);
  const refundedAmount = getRefundedAmount(booking);
  const nonRefundableAmount = getNonRefundableTokenAmount(booking, policy);
  const refundableAmount = Math.max(
    0,
    paidAmount - refundedAmount - nonRefundableAmount,
  );

  return {
    bookingId: booking.id,
    status: booking.status,
    paidAmount,
    refundedAmount,
    refundableAmount,
    nonRefundableAmount,
    tokenRefundable: policy.tokenRefundable,
    guestPolicyText: policy.guestPolicyText,
  };
};
