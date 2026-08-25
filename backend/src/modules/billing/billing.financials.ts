import { HttpError } from "@/common/errors/http-error.js";
import { Prisma } from "@/generated/prisma/client.js";

type FolioChargeFinancialInput = {
  amount: Prisma.Decimal;
  metadata: Prisma.JsonValue | null;
};

const zeroDecimal = new Prisma.Decimal(0);

const getMetadataRecord = (metadata: Prisma.JsonValue | null) =>
  metadata !== null && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata
    : null;

const readDecimal = (
  metadata: Prisma.JsonObject | null,
  keys: readonly string[],
) => {
  if (metadata === null) return null;

  for (const key of keys) {
    const value = metadata[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new HttpError(
        409,
        "FOLIO_FINANCIAL_SNAPSHOT_INVALID",
        `Folio financial snapshot field ${key} is invalid`,
      );
    }

    try {
      const amount = new Prisma.Decimal(value);
      if (!amount.isFinite()) throw new Error("Non-finite decimal");
      return amount;
    } catch {
      throw new HttpError(
        409,
        "FOLIO_FINANCIAL_SNAPSHOT_INVALID",
        `Folio financial snapshot field ${key} is invalid`,
      );
    }
  }

  return null;
};

export const getFolioChargeFinancialBreakdown = (
  charge: FolioChargeFinancialInput,
) => {
  const metadata = getMetadataRecord(charge.metadata);
  const declaredTotal = readDecimal(metadata, [
    "totalAmount",
    "totalAdjustment",
  ]);
  if (declaredTotal !== null && !declaredTotal.equals(charge.amount)) {
    throw new HttpError(
      409,
      "FOLIO_FINANCIAL_SNAPSHOT_MISMATCH",
      "Folio financial snapshot total does not match the charge amount",
    );
  }

  const storedBase = readDecimal(metadata, ["baseAmount", "baseDifference"]);
  const storedTax = readDecimal(metadata, ["taxAmount", "taxDifference"]);
  const baseAmount =
    storedBase ?? charge.amount.minus(storedTax ?? zeroDecimal);
  const taxAmount =
    storedTax ?? charge.amount.minus(storedBase ?? charge.amount);

  if (!baseAmount.plus(taxAmount).equals(charge.amount)) {
    throw new HttpError(
      409,
      "FOLIO_FINANCIAL_SNAPSHOT_MISMATCH",
      "Folio financial snapshot base and tax do not match the charge amount",
    );
  }

  return {
    baseAmount,
    taxAmount,
    totalAmount: charge.amount,
    taxBreakdown:
      metadata !== null && Array.isArray(metadata.taxBreakdown)
        ? metadata.taxBreakdown
        : [],
  };
};

export const getFolioFinancialTotals = (
  charges: readonly FolioChargeFinancialInput[],
) =>
  charges.reduce(
    (totals, charge) => {
      const breakdown = getFolioChargeFinancialBreakdown(charge);
      return {
        baseAmount: totals.baseAmount.plus(breakdown.baseAmount),
        taxAmount: totals.taxAmount.plus(breakdown.taxAmount),
        totalAmount: totals.totalAmount.plus(breakdown.totalAmount),
      };
    },
    {
      baseAmount: zeroDecimal,
      taxAmount: zeroDecimal,
      totalAmount: zeroDecimal,
    },
  );
