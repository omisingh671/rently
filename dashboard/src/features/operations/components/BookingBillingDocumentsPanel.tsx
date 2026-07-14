import Button from "@/components/ui/Button";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import type { BillingDocument } from "@/features/billing/types";
import { formatMoney } from "../bookingDisplay";
import { FiDownload, FiFileText } from "react-icons/fi";

type BookingBillingDocumentsPanelProps = {
  billingDocuments: BillingDocument[];
  invoiceDocument?: BillingDocument;
  isPending: boolean;
  canGenerateInvoice: boolean;
  isBillingMutating: boolean;
  onDownloadDocument: (document: BillingDocument) => void;
  onGenerateInvoice: () => void;
};

export function BookingBillingDocumentsPanel({
  billingDocuments,
  invoiceDocument,
  isPending,
  canGenerateInvoice,
  isBillingMutating,
  onDownloadDocument,
  onGenerateInvoice,
}: BookingBillingDocumentsPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Billing Documents
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Frozen invoice and receipt snapshots for this booking.
          </p>
        </div>
        {invoiceDocument ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<FiDownload />}
            disabled={isBillingMutating}
            onClick={() => onDownloadDocument(invoiceDocument)}
          >
            Download Invoice
          </Button>
        ) : !canGenerateInvoice ? (
          <p className="text-right text-xs text-slate-500">
            Full payment is required before invoice generation.
          </p>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="primary"
            icon={<FiFileText />}
            disabled={isBillingMutating}
            onClick={onGenerateInvoice}
          >
            Generate Invoice
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {isPending ? (
          <p className="text-sm text-slate-500">Loading documents...</p>
        ) : billingDocuments.length === 0 ? (
          <p className="text-sm text-slate-500">
            No billing documents generated yet.
          </p>
        ) : (
          billingDocuments.map((document) => (
            <div
              key={document.id}
              className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">
                  {document.documentNumber}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {formatEnumLabel(document.type)} /{" "}
                  {formatEnumLabel(document.status)} /{" "}
                  {formatMoney(document.total)}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                icon={<FiDownload />}
                disabled={isBillingMutating}
                onClick={() => onDownloadDocument(document)}
              >
                Download
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
