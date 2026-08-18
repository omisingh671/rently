import assert from "node:assert/strict";
import test from "node:test";
import {
  BookingStatus,
  FolioChargeStatus,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";
import {
  calculateGroupMemberFinancials,
  calculateGroupMemberSummary,
} from "./commercial.financials.js";

const amount = (value: number) => new Prisma.Decimal(value);

const fullyRefundedNoShow = {
  status: BookingStatus.NO_SHOW,
  totalAmount: amount(4000),
  folioCharges: [],
  payments: [
    {
      amount: amount(4000),
      status: PaymentStatus.SUCCEEDED,
      refunds: [
        {
          amount: amount(4000),
          status: PaymentRefundStatus.SUCCEEDED,
        },
      ],
    },
  ],
};

test("fully refunded no-show remains historical but is not collectible", () => {
  const financials = calculateGroupMemberFinancials(fullyRefundedNoShow);

  assert.equal(financials.grossAmount.toString(), "4000");
  assert.equal(financials.paidAmount.toString(), "4000");
  assert.equal(financials.refundedAmount.toString(), "4000");
  assert.equal(financials.netPaidAmount.toString(), "0");
  assert.equal(financials.balanceAmount.toString(), "0");
  assert.equal(financials.nonCollectibleAmount.toString(), "4000");
});

test("active member balance includes refunds and active guest-folio charges", () => {
  const financials = calculateGroupMemberFinancials({
    status: BookingStatus.CONFIRMED,
    totalAmount: amount(4000),
    folioCharges: [
      { amount: amount(500), status: FolioChargeStatus.ACTIVE },
      { amount: amount(250), status: FolioChargeStatus.VOID },
    ],
    payments: [
      {
        amount: amount(4000),
        status: PaymentStatus.SUCCEEDED,
        refunds: [
          {
            amount: amount(1000),
            status: PaymentRefundStatus.SUCCEEDED,
          },
        ],
      },
    ],
  });

  assert.equal(financials.grossAmount.toString(), "4500");
  assert.equal(financials.netPaidAmount.toString(), "3000");
  assert.equal(financials.balanceAmount.toString(), "1500");
  assert.equal(financials.nonCollectibleAmount.toString(), "0");
});

test("group summary separates historical value from collectible balance", () => {
  const summary = calculateGroupMemberSummary([
    fullyRefundedNoShow,
    {
      status: BookingStatus.CONFIRMED,
      totalAmount: amount(2000),
      folioCharges: [],
      payments: [],
    },
  ]);

  assert.equal(summary.memberValue.toString(), "6000");
  assert.equal(summary.memberBalance.toString(), "2000");
  assert.equal(summary.nonCollectibleAmount.toString(), "4000");
});
