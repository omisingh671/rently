import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "@/common/errors/http-error.js";
import { Prisma } from "@/generated/prisma/client.js";
import {
  getFolioChargeFinancialBreakdown,
  getFolioFinancialTotals,
} from "./billing.financials.js";

const charge = (amount: string, metadata: Prisma.JsonValue | null) => ({
  amount: new Prisma.Decimal(amount),
  metadata,
});

test("reads canonical folio base, tax, total, and component snapshot", () => {
  const breakdown = getFolioChargeFinancialBreakdown(
    charge("1180", {
      baseAmount: "1000",
      taxAmount: "180",
      totalAmount: "1180",
      taxBreakdown: [{ name: "GST", amount: "180" }],
    }),
  );

  assert.equal(breakdown.baseAmount.toString(), "1000");
  assert.equal(breakdown.taxAmount.toString(), "180");
  assert.equal(breakdown.totalAmount.toString(), "1180");
  assert.deepEqual(breakdown.taxBreakdown, [{ name: "GST", amount: "180" }]);
});

test("supports legacy signed room-move difference fields", () => {
  const breakdown = getFolioChargeFinancialBreakdown(
    charge("-590", {
      baseDifference: "-500",
      taxDifference: "-90",
      totalAdjustment: "-590",
    }),
  );

  assert.equal(breakdown.baseAmount.toString(), "-500");
  assert.equal(breakdown.taxAmount.toString(), "-90");
  assert.equal(breakdown.totalAmount.toString(), "-590");
});

test("treats a legacy charge without tax metadata as tax-exclusive zero-tax base", () => {
  const breakdown = getFolioChargeFinancialBreakdown(charge("250", null));

  assert.equal(breakdown.baseAmount.toString(), "250");
  assert.equal(breakdown.taxAmount.toString(), "0");
  assert.equal(breakdown.totalAmount.toString(), "250");
});

test("aggregates signed folio base and tax without number conversion", () => {
  const totals = getFolioFinancialTotals([
    charge("1180", {
      baseAmount: "1000",
      taxAmount: "180",
      totalAmount: "1180",
    }),
    charge("-118", {
      baseDifference: "-100",
      taxDifference: "-18",
      totalAdjustment: "-118",
    }),
  ]);

  assert.equal(totals.baseAmount.toString(), "900");
  assert.equal(totals.taxAmount.toString(), "162");
  assert.equal(totals.totalAmount.toString(), "1062");
});

test("rejects a folio snapshot whose components do not match its amount", () => {
  assert.throws(
    () =>
      getFolioChargeFinancialBreakdown(
        charge("1180", {
          baseAmount: "1000",
          taxAmount: "100",
          totalAmount: "1180",
        }),
      ),
    (error: unknown) =>
      error instanceof HttpError &&
      error.code === "FOLIO_FINANCIAL_SNAPSHOT_MISMATCH",
  );
});
