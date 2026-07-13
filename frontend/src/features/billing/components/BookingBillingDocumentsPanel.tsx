import { FiDownload, FiFileText } from "react-icons/fi";

import Button from "@/components/ui/Button";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import type { BillingDocument } from "../types";

type BookingBillingDocumentsPanelProps = {
  documents: BillingDocument[];
  isLoading: boolean;
  isDownloading: boolean;
  downloadError: string;
  onDownload: (document: BillingDocument) => void;
};

export default function BookingBillingDocumentsPanel({
  documents,
  isLoading,
  isDownloading,
  downloadError,
  onDownload,
}: BookingBillingDocumentsPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="mb-6 flex items-center gap-3 text-lg font-bold text-slate-900">
        <FiFileText className="text-indigo-500" />
        Billing Documents
      </h2>

      {downloadError && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {downloadError}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-slate-500">
          Billing documents will appear here after confirmation or successful
          payment.
        </p>
      ) : (
        <div className="space-y-3">
          {documents.map((document) => (
            <div
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {document.documentNumber}
                </p>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {formatEnumLabel(document.type)} /{" "}
                  {formatEnumLabel(document.status)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isDownloading}
                onClick={() => onDownload(document)}
              >
                <FiDownload className="mr-2" />
                Download
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
