import {
  BookingStatus,
  FolioChargeStatus,
  PaymentRefundStatus,
  PaymentStatus,
  Prisma,
} from "@/generated/prisma/client.js";

type GroupMemberFinancialInput = {
  status: BookingStatus;
  totalAmount: Prisma.Decimal;
  folioCharges: Array<{
    amount: Prisma.Decimal;
    status: FolioChargeStatus;
  }>;
  payments: Array<{
    amount: Prisma.Decimal;
    status: PaymentStatus;
    refunds: Array<{
      amount: Prisma.Decimal;
      status: PaymentRefundStatus;
    }>;
  }>;
};

const zero = () => new Prisma.Decimal(0);
const maxZero = (amount: Prisma.Decimal) =>
  amount.lessThan(0) ? zero() : amount;

const nonCollectibleStatuses = new Set<BookingStatus>([
  BookingStatus.CANCELLED,
  BookingStatus.NO_SHOW,
]);

export const calculateGroupMemberFinancials = (
  booking: GroupMemberFinancialInput,
) => {
  const paidAmount = booking.payments
    .filter((payment) => payment.status === PaymentStatus.SUCCEEDED)
    .reduce((sum, payment) => sum.plus(payment.amount), zero());
  const refundedAmount = booking.payments.reduce(
    (paymentSum, payment) =>
      paymentSum.plus(
        payment.refunds
          .filter((refund) => refund.status === PaymentRefundStatus.SUCCEEDED)
          .reduce((refundSum, refund) => refundSum.plus(refund.amount), zero()),
      ),
    zero(),
  );
  const netPaidAmount = maxZero(paidAmount.minus(refundedAmount));
  const folioTotal = booking.folioCharges
    .filter((charge) => charge.status === FolioChargeStatus.ACTIVE)
    .reduce((sum, charge) => sum.plus(charge.amount), zero());
  const grossAmount = booking.totalAmount.plus(folioTotal);
  const unsettledAmount = maxZero(grossAmount.minus(netPaidAmount));
  const isNonCollectible = nonCollectibleStatuses.has(booking.status);

  return {
    paidAmount,
    refundedAmount,
    netPaidAmount,
    folioTotal,
    grossAmount,
    balanceAmount: isNonCollectible ? zero() : unsettledAmount,
    nonCollectibleAmount: isNonCollectible ? unsettledAmount : zero(),
  };
};

export const calculateGroupMemberSummary = (
  bookings: GroupMemberFinancialInput[],
) =>
  bookings.reduce(
    (summary, booking) => {
      const financials = calculateGroupMemberFinancials(booking);
      return {
        memberTotal: summary.memberTotal.plus(booking.totalAmount),
        memberFolioCharges: summary.memberFolioCharges.plus(
          financials.folioTotal,
        ),
        memberValue: summary.memberValue.plus(financials.grossAmount),
        paid: summary.paid.plus(financials.paidAmount),
        refunded: summary.refunded.plus(financials.refundedAmount),
        netPaid: summary.netPaid.plus(financials.netPaidAmount),
        memberBalance: summary.memberBalance.plus(financials.balanceAmount),
        nonCollectibleAmount: summary.nonCollectibleAmount.plus(
          financials.nonCollectibleAmount,
        ),
      };
    },
    {
      memberTotal: zero(),
      memberFolioCharges: zero(),
      memberValue: zero(),
      paid: zero(),
      refunded: zero(),
      netPaid: zero(),
      memberBalance: zero(),
      nonCollectibleAmount: zero(),
    },
  );
