import { useMemo, useState } from "react";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";
import { useAccountingJournal, useAccountingReconciliation } from "./hooks";

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: string, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(value));

export default function AccountingJournalSection({ propertyId }: { propertyId?: string }) {
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [sourceType, setSourceType] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const params = useMemo(
    () => ({
      page: 1,
      limit: 50,
      startDate,
      endDate,
      ...(propertyId && { propertyId }),
      ...(sourceType && { sourceType }),
    }),
    [endDate, propertyId, sourceType, startDate],
  );
  const validRange = endDate >= startDate;
  const journal = useAccountingJournal(params, validRange);
  const reconciliation = useAccountingReconciliation(params, validRange);
  const error = journal.error ?? reconciliation.error;

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Accounting journal</h2>
          <p className="text-sm text-slate-500">Read-only double-entry postings and operational reconciliation.</p>
        </div>
        {reconciliation.data && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reconciliation.data.balanced ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {reconciliation.data.balanced ? "Reconciled" : "Needs review"}
          </span>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm" />
        <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
          <option value="">All posting sources</option>
          <option value="PAYMENT">Payments</option>
          <option value="PAYMENT_REFUND">Refunds</option>
          <option value="BILLING_DOCUMENT">Billing documents</option>
          <option value="DEPOSIT_APPLICATION">Deposit applications</option>
          <option value="BILLING_DOCUMENT_VOID">Reversals</option>
        </select>
      </div>
      {!validRange && <p className="text-sm text-rose-700">End date must be on or after start date.</p>}
      {error && <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{normalizeApiError(error).message}</p>}
      {reconciliation.data && (
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-md bg-slate-50 p-3"><div className="text-slate-500">Missing payments</div><div className="text-lg font-semibold">{reconciliation.data.missing.payments}</div></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-slate-500">Missing refunds</div><div className="text-lg font-semibold">{reconciliation.data.missing.refunds}</div></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-slate-500">Missing documents</div><div className="text-lg font-semibold">{reconciliation.data.missing.billingDocuments}</div></div>
          <div className="rounded-md bg-slate-50 p-3"><div className="text-slate-500">Unbalanced entries</div><div className="text-lg font-semibold">{reconciliation.data.unbalancedEntries}</div></div>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Date / source</th><th className="px-3 py-2">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {journal.isPending ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">Loading journal...</td></tr> : (journal.data?.items ?? []).length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">No postings for this range.</td></tr> : journal.data?.items.map((entry) => (
              <tr key={entry.id} className="cursor-pointer align-top hover:bg-slate-50" onClick={() => setExpandedId((current) => current === entry.id ? null : entry.id)}>
                <td className="px-3 py-3"><div>{entry.businessDate}</div><div className="text-xs text-slate-500">{formatEnumLabel(entry.sourceType)} · {entry.status}</div></td>
                <td className="px-3 py-3"><div className="font-medium text-slate-900">{entry.description}</div>{expandedId === entry.id && <div className="mt-2 space-y-1 border-l-2 border-blue-200 pl-3">{entry.lines.map((line) => <div key={line.id} className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs text-slate-600"><span>{line.accountCode} · {line.accountName}</span><span>{Number(line.debit) > 0 ? money(line.debit, entry.currency) : "-"}</span><span>{Number(line.credit) > 0 ? money(line.credit, entry.currency) : "-"}</span></div>)}</div>}</td>
                <td className="px-3 py-3 text-right font-medium">{money(entry.totalDebit, entry.currency)}</td>
                <td className="px-3 py-3 text-right font-medium">{money(entry.totalCredit, entry.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
