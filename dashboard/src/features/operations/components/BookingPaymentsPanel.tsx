import Button from "@/components/ui/Button";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import type { BillingDocument } from "@/features/billing/types";
import {
  formatDateTime,
  formatMoney,
  getPaymentMethodLabel,
  getPaymentPurposeLabel,
} from "../bookingDisplay";
import type { AdminBooking } from "../types";
import { FiAlertTriangle, FiCreditCard, FiDownload, FiFileText } from "react-icons/fi";

type BookingPaymentsPanelProps = {
  booking: AdminBooking;
  canShowRefunds: boolean;
  canActOnRefundRequest: boolean;
  refundRequestPaymentId?: string;
  receiptByPaymentId: Map<string, BillingDocument>;
  isMutating: boolean;
  isBillingMutating: boolean;
  onMarkRefundRequestInReview: () => void;
  onProcessRefundRequest: (paymentId: string) => void;
  onRejectRefundRequest: () => void;
  onDownloadReceipt: (document: BillingDocument) => void;
  onGenerateReceipt: (paymentId: string) => void;
  onRecordRefund: (paymentId: string) => void;
};

export function BookingPaymentsPanel({
  booking,
  canShowRefunds,
  canActOnRefundRequest,
  refundRequestPaymentId,
  receiptByPaymentId,
  isMutating,
  isBillingMutating,
  onMarkRefundRequestInReview,
  onProcessRefundRequest,
  onRejectRefundRequest,
  onDownloadReceipt,
  onGenerateReceipt,
  onRecordRefund,
}: BookingPaymentsPanelProps) {
  return (
    <>
      {canShowRefunds && (
        <div className="rounded-xl border border-amber-200 bg-linear-to-r from-amber-50/80 to-orange-50/50 p-5 shadow-sm">
          <div className="flex gap-3.5 items-start">
            <span className="rounded-lg bg-amber-100 p-2 text-amber-700 shrink-0">
              <FiAlertTriangle size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block mb-1">
                Refund Request
              </span>
              {booking.refundRequest ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">
                      Guest requested a refund
                    </h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        booking.refundRequest.status === "REQUESTED"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : booking.refundRequest.status === "IN_REVIEW"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : booking.refundRequest.status === "FULFILLED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {formatEnumLabel(booking.refundRequest.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium italic border-l-2 border-amber-400 pl-3 py-0.5 my-1.5 bg-amber-500/5 rounded-r">
                    "{booking.refundRequest.reason}"
                  </p>
                  {booking.refundRequest.adminNote && (
                    <p className="text-xs text-amber-800 font-medium">
                      <span className="font-semibold">Admin Note:</span>{" "}
                      {booking.refundRequest.adminNote}
                    </p>
                  )}
                </div>
              ) : Number(booking.refundableAmount) > 0 ? (
                <p className="text-xs text-slate-600">
                  No active guest refund request. Admin can still record a
                  manual refund.
                </p>
              ) : (
                <p className="text-xs text-slate-600 font-medium">
                  Refund has been fully completed.
                </p>
              )}
            </div>
          </div>

          {canActOnRefundRequest && (
            <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-amber-200/50 pt-4">
              {booking.refundRequest?.status === "REQUESTED" && (
                <Button
                  type="button"
                  size="md"
                  variant="secondary"
                  disabled={isMutating}
                  onClick={onMarkRefundRequestInReview}
                >
                  Mark In Review
                </Button>
              )}
              {refundRequestPaymentId !== undefined && (
                <Button
                  type="button"
                  size="md"
                  variant="primary"
                  disabled={isMutating}
                  onClick={() => onProcessRefundRequest(refundRequestPaymentId)}
                >
                  Process refund
                </Button>
              )}
              <Button
                type="button"
                size="md"
                variant="danger"
                outline
                disabled={isMutating}
                onClick={onRejectRefundRequest}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">
          Recorded Payments
        </h3>
        <div className="mt-4 divide-y divide-slate-200">
          {booking.payments.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No payments recorded.</p>
          ) : (
            booking.payments.map((payment) => {
              const isSucceeded = payment.status === "SUCCEEDED";
              const isFailed = payment.status === "FAILED";
              const isPending = payment.status === "PENDING";
              return (
                <div
                  key={payment.id}
                  className="py-5 first:pt-0 last:pb-0 transition duration-150"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xl font-bold text-slate-900 tracking-tight">
                      {formatMoney(payment.amount)}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${
                        isSucceeded
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : isFailed
                            ? "bg-rose-50 text-rose-700 border-rose-200/60"
                            : isPending
                              ? "bg-amber-50 text-amber-700 border-amber-200/60"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {formatEnumLabel(payment.status)}
                    </span>
                  </div>

                  <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Purpose
                    </span>
                    <span className="min-w-0 font-semibold text-slate-800">
                      {getPaymentPurposeLabel(payment.purpose)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[9px] tracking-wider uppercase">
                      {getPaymentMethodLabel(payment.method)}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span>
                      {formatDateTime(payment.paidAt ?? payment.createdAt)}
                    </span>
                  </div>

                  {(payment.referenceId || payment.payerDetail) && (
                    <div className="mt-3 grid gap-2 border-l-2 border-slate-200 pl-3.5 py-0.5 text-xs text-slate-600 sm:grid-cols-2">
                      {payment.referenceId && (
                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Reference
                          </span>
                          <span className="mt-0.5 block font-semibold text-slate-800">
                            {payment.referenceId}
                          </span>
                        </div>
                      )}
                      {payment.payerDetail && (
                        <div>
                          <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Payer detail
                          </span>
                          <span className="mt-0.5 block font-semibold text-slate-800">
                            {payment.payerDetail}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Refunded:</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {formatMoney(payment.refundedAmount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Refundable:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          Number(payment.refundableAmount) > 0
                            ? "text-amber-800 bg-amber-50"
                            : "text-slate-800 bg-slate-100"
                        }`}
                      >
                        {formatMoney(payment.refundableAmount)}
                      </span>
                    </div>
                  </div>

                  {payment.refunds.length > 0 && (
                    <div className="mt-3.5 space-y-2 border-l-2 border-amber-200 pl-3.5 py-0.5 text-xs text-slate-600">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-amber-600/80 mb-1">
                        Refund Transactions
                      </div>
                      {payment.refunds.map((refund) => (
                        <div
                          key={refund.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 last:border-0 pb-1.5 last:pb-0"
                        >
                          <span className="flex items-center gap-1.5 font-medium text-slate-600">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            {getPaymentMethodLabel(refund.method)} refund /{" "}
                            {formatEnumLabel(refund.status)}
                          </span>
                          <span className="font-bold text-amber-800">
                            -{formatMoney(refund.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {payment.status === "SUCCEEDED" && (
                    <div className="mt-4 flex flex-wrap gap-2 pt-1">
                      {receiptByPaymentId.get(payment.id) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<FiDownload />}
                          disabled={isBillingMutating}
                          onClick={() => {
                            const receipt = receiptByPaymentId.get(payment.id);
                            if (receipt) {
                              onDownloadReceipt(receipt);
                            }
                          }}
                        >
                          Receipt
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<FiFileText />}
                          disabled={isBillingMutating}
                          onClick={() => onGenerateReceipt(payment.id)}
                        >
                          Generate Receipt
                        </Button>
                      )}
                      {(booking.status === "CANCELLED" ||
                        booking.status === "NO_SHOW") &&
                        Number(payment.refundableAmount) > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="warning"
                            icon={<FiCreditCard />}
                            disabled={isMutating}
                            onClick={() => onRecordRefund(payment.id)}
                          >
                            {payment.provider === "MANUAL"
                              ? "Record Manual Refund"
                              : "Process Gateway Refund"}
                          </Button>
                        )}
                    </div>
                  )}

                  {payment.note && (
                    <p className="mt-3.5 text-xs font-medium text-slate-500 border-l-2 border-slate-200 pl-3.5 py-0.5">
                      <span className="font-semibold text-slate-700">
                        Note:{" "}
                      </span>
                      {payment.note}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
