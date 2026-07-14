import type { PropertyBookingPolicy } from "@/generated/prisma/client.js";

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const numberValue = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

export type StayPolicySnapshot = {
  policyId: string;
  capturedAt: string;
  checkInTime: string;
  checkOutTime: string;
  earlyCheckIn: {
    enabled: boolean;
    feeType: "NONE" | "FIXED_AMOUNT";
    feeValue: number;
    overrideRole: "ADMIN";
  };
  earlyCheckout: {
    refundUnusedNights: boolean;
    refundPercentage: number;
    manualReviewRequired: boolean;
    overrideRole: "ADMIN";
  };
  lateCheckout: {
    feeType: "NIGHTLY_RATE_MULTIPLIER" | "FIXED_AMOUNT";
    feeValue: number;
    graceMinutes: number;
    overrideRole: "ADMIN";
  };
  downgrade: {
    financialTreatment: "NO_CREDIT" | "CREDIT_DIFFERENCE" | "WAIVER";
    overrideRole: "ADMIN";
  };
};

export const buildStayPolicySnapshot = (
  policy: PropertyBookingPolicy,
  capturedAt = new Date(),
): StayPolicySnapshot => {
  const earlyCheckIn = asRecord(policy.earlyCheckInRules);
  const earlyCheckout = asRecord(policy.earlyCheckoutRules);
  const lateCheckout = asRecord(policy.lateCheckoutRules);
  const downgrade = asRecord(policy.downgradeRules);
  return {
    policyId: policy.id,
    capturedAt: capturedAt.toISOString(),
    checkInTime: policy.checkInTime,
    checkOutTime: policy.checkOutTime,
    earlyCheckIn: {
      enabled: earlyCheckIn.enabled !== false,
      feeType:
        earlyCheckIn.feeType === "FIXED_AMOUNT" ? "FIXED_AMOUNT" : "NONE",
      feeValue: Math.max(0, numberValue(earlyCheckIn.feeValue, 0)),
      overrideRole: "ADMIN",
    },
    earlyCheckout: {
      refundUnusedNights: earlyCheckout.refundUnusedNights === true,
      refundPercentage: Math.min(
        100,
        Math.max(0, numberValue(earlyCheckout.refundPercentage, 100)),
      ),
      manualReviewRequired: earlyCheckout.manualReviewRequired !== false,
      overrideRole: "ADMIN",
    },
    lateCheckout: {
      feeType:
        lateCheckout.feeType === "FIXED_AMOUNT"
          ? "FIXED_AMOUNT"
          : "NIGHTLY_RATE_MULTIPLIER",
      feeValue: Math.max(0, numberValue(lateCheckout.feeValue, 1)),
      graceMinutes: Math.min(
        1440,
        Math.max(0, Math.trunc(numberValue(lateCheckout.graceMinutes, 0))),
      ),
      overrideRole: "ADMIN",
    },
    downgrade: {
      financialTreatment:
        downgrade.financialTreatment === "CREDIT_DIFFERENCE" ||
        downgrade.financialTreatment === "WAIVER"
          ? downgrade.financialTreatment
          : "NO_CREDIT",
      overrideRole: "ADMIN",
    },
  };
};
