import type { ReactNode } from "react";
import { FiCheckCircle, FiDownload } from "react-icons/fi";
import type { BillingDocument } from "@/features/billing/types";

type PaymentSuccessStateProps = {
  bookingRef: string;
  guestName: string;
  stayPeriod: string;
  reservedSpace: string;
  guestEmail: string;
  invoiceDocument: BillingDocument | undefined;
  receiptDocuments: BillingDocument[];
  isDownloading: boolean;
  onDownload: (document: BillingDocument) => void;
  actions: ReactNode;
};

export function PaymentSuccessState({
  bookingRef,
  guestName,
  stayPeriod,
  reservedSpace,
  guestEmail,
  invoiceDocument,
  receiptDocuments,
  isDownloading,
  onDownload,
  actions,
}: PaymentSuccessStateProps) {
  return (
    <section className="section flex min-h-screen items-start justify-center bg-slate-50/50 py-12">
      <div className="container max-w-2xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-xl md:p-12">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-emerald-50/20 via-transparent to-transparent" />

          <div className="relative mb-8 flex justify-center">
            <div className="absolute inset-0 scale-75 animate-pulse rounded-full bg-emerald-500/10 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500/20 bg-emerald-50 text-emerald-600 shadow-md">
              <FiCheckCircle className="h-10 w-10 animate-fade" />
            </div>
          </div>

          <h1 className="text-3xl leading-none font-black tracking-tight text-slate-900">
            Booking Confirmed & Secured!
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed font-medium text-slate-500">
            Your payment was processed successfully. We&apos;ve updated your
            booking status and reserved your space.
          </p>

          <div className="mx-auto mt-8 max-w-xl space-y-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <SummaryValue label="Booking Reference" value={bookingRef} />
              <SummaryValue label="Guest Name" value={guestName} alignRight />
            </div>
            <div className="flex items-center justify-between pt-1">
              <SummaryValue label="Stay Period" value={stayPeriod} compact />
              <SummaryValue
                label="Reserved Space"
                value={reservedSpace}
                alignRight
                compact
              />
            </div>
          </div>

          {(invoiceDocument || receiptDocuments.length > 0) && (
            <div className="mt-8 text-center">
              <h3 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                Download Booking Documents
              </h3>
              <div
                className={`mx-auto grid max-w-xl gap-3 text-left ${
                  (invoiceDocument ? 1 : 0) + receiptDocuments.length === 1
                    ? "grid-cols-1"
                    : "sm:grid-cols-2"
                }`}
              >
                {invoiceDocument && (
                  <DocumentTile
                    label="Booking Invoice"
                    document={invoiceDocument}
                    disabled={isDownloading}
                    onDownload={onDownload}
                  />
                )}
                {receiptDocuments.map((receipt, index) => (
                  <DocumentTile
                    key={receipt.id}
                    label={`Receipt #${index + 1}`}
                    document={receipt}
                    disabled={isDownloading}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}

          <p className="mt-8 text-xs font-medium text-slate-400">
            We&apos;ve sent a digital copy of your receipts and check-in voucher
            to <span className="font-bold text-slate-500">{guestEmail}</span>.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 border-t border-slate-100 pt-6">
            {actions}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryValue({
  label,
  value,
  alignRight = false,
  compact = false,
}: {
  label: string;
  value: string;
  alignRight?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={alignRight ? "text-right" : undefined}>
      <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
        {label}
      </span>
      <span
        className={`mt-1 block ${
          compact
            ? "text-xs font-bold text-slate-700"
            : "text-sm font-black text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DocumentTile({
  label,
  document,
  disabled,
  onDownload,
}: {
  label: string;
  document: BillingDocument;
  disabled: boolean;
  onDownload: (document: BillingDocument) => void;
}) {
  return (
    <div className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-150 hover:border-indigo-100 hover:shadow-indigo-50/30">
      <div className="truncate pr-2">
        <span className="block truncate text-xs font-bold text-slate-800 transition group-hover:text-indigo-600">
          {label}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold text-slate-400 uppercase">
          {document.documentNumber}
        </span>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDownload(document)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition duration-150 hover:bg-indigo-600 hover:text-white"
      >
        <FiDownload className="h-4 w-4" />
      </button>
    </div>
  );
}
