import { FiCreditCard, FiInfo, FiTag } from "react-icons/fi";

import Button from "@/components/ui/Button";
import type { Booking } from "../types";

type BookingPaymentSummaryPanelProps = {
  booking: Booking;
  balancePaidDisplayAmount: number;
  fullPaidDisplayAmount: number;
  showTokenAmountCard: boolean;
  showBalanceAmountCard: boolean;
  showPaidAmountCard: boolean;
  showUpfrontAmountDue: boolean;
  showPayAtProperty: boolean;
  canPayPendingBalance: boolean;
  pendingBalancePaymentPath: string;
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export default function BookingPaymentSummaryPanel({
  booking,
  balancePaidDisplayAmount,
  fullPaidDisplayAmount,
  showTokenAmountCard,
  showBalanceAmountCard,
  showPaidAmountCard,
  showUpfrontAmountDue,
  showPayAtProperty,
  canPayPendingBalance,
  pendingBalancePaymentPath,
}: BookingPaymentSummaryPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="mb-6 flex items-center gap-3 text-lg font-bold text-slate-900">
        <FiCreditCard className="text-indigo-500" />
        Payment Summary
      </h2>

      <div className="space-y-4">
        <div className="flex justify-between text-sm font-medium text-slate-600">
          <span>Total Stay Price</span>
          <span className="font-bold text-slate-900">
            {formatPrice(
              booking.subtotalAmount ||
                booking.totalPrice + booking.discountAmount,
            )}
          </span>
        </div>

        {booking.discountAmount > 0 && (
          <div className="flex justify-between text-sm font-medium text-emerald-600">
            <div className="flex items-center gap-1.5">
              <FiTag className="h-3.5 w-3.5" />
              <span>
                Discount {booking.couponCode ? `(${booking.couponCode})` : ""}
              </span>
            </div>
            <span className="font-bold">
              -{formatPrice(booking.discountAmount)}
            </span>
          </div>
        )}

        {booking.taxBreakdown.map((tax) => (
          <div
            key={`${tax.taxId}-${tax.included ? "in" : "ex"}`}
            className="flex justify-between text-sm font-medium text-slate-600"
          >
            <span>
              {tax.name} {tax.included ? "(included)" : ""}
            </span>
            <span className="font-bold text-slate-900">
              {formatPrice(tax.taxAmount)}
            </span>
          </div>
        ))}

        <div className="mt-2 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-base font-extrabold text-slate-900">
            <span>Grand Total</span>
            <span className="text-xl text-indigo-600">
              {formatPrice(booking.totalPrice)}
            </span>
          </div>
        </div>

        {showTokenAmountCard && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Token Amount
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {formatPrice(booking.upfrontAmount)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                  booking.tokenPaymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-700"
                    : booking.tokenPaymentStatus === "UNPAID"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-200 text-slate-600"
                }`}
              >
                {booking.tokenPaymentStatus === "PAID"
                  ? "Paid"
                  : booking.tokenPaymentStatus === "UNPAID"
                    ? "Unpaid"
                    : "Not required"}
              </span>
            </div>
            {booking.tokenPaymentStatus === "PAID" && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Received {formatPrice(booking.tokenPaidAmount)}
              </p>
            )}
          </div>
        )}

        {showBalanceAmountCard && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Balance Amount
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {formatPrice(balancePaidDisplayAmount)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Paid
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              Received {formatPrice(balancePaidDisplayAmount)}
            </p>
          </div>
        )}

        {showPaidAmountCard && (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Paid Amount
                </p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {formatPrice(fullPaidDisplayAmount)}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                Paid
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-emerald-700">
              Received {formatPrice(fullPaidDisplayAmount)}
            </p>
          </div>
        )}

        {showUpfrontAmountDue && (
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
              Upfront Amount Due
            </p>
            <p className="text-2xl font-black text-indigo-900">
              {formatPrice(booking.upfrontAmount)}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase leading-tight text-indigo-500">
              Required to confirm your stay
            </p>
          </div>
        )}

        {showPayAtProperty && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <FiInfo className="mt-0.5 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-amber-900">
                Pay at Property
              </p>
              <p className="text-lg font-black text-amber-600">
                {formatPrice(booking.remainingPayAtCheckIn)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-amber-700">
                Pay this balance during check-in
              </p>
              {canPayPendingBalance && (
                <Button
                  to={pendingBalancePaymentPath}
                  size="sm"
                  variant="primary"
                  className="mt-4"
                >
                  <FiCreditCard className="mr-2" />
                  Pay Pending Balance
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
