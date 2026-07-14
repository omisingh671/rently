import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useBillingActions, useBillingDocuments } from "@/features/billing/hooks";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import type {
  BillingDocumentStatus,
  BillingDocumentType,
} from "@/features/billing/types";
import { useAuthStore } from "@/stores/authStore";
import { normalizeApiError } from "@/utils/errors";
import { formatEnumLabel } from "@/utils/formatEnumLabel";

const documentTypes: Array<"" | BillingDocumentType> = [
  "",
  "INVOICE",
  "RECEIPT",
  "CREDIT_NOTE",
  "DEBIT_NOTE",
];
const documentStatuses: Array<"" | BillingDocumentStatus> = [
  "",
  "ISSUED",
  "DRAFT",
  "CANCELLED",
  "VOID",
];

const formatMoney = (value: string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "-";

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

type PropertyFilterMode = "current" | "all";

export default function BillingPage() {
  const { properties, selectedPropertyId, setSelectedPropertyId } =
    useCurrentProperty();
  const billingActions = useBillingActions();
  const canVoid = useAuthStore((state) =>
    state.hasAnyRole(["SUPER_ADMIN", "ADMIN"]),
  );
  const [page] = useState(1);
  const [propertyFilterMode, setPropertyFilterMode] =
    useState<PropertyFilterMode>("current");
  const [filters, setFilters] = useState({
    type: "" as "" | BillingDocumentType,
    status: "" as "" | BillingDocumentStatus,
    bookingRef: "",
    guest: "",
    from: "",
    to: "",
  });
  const activePropertyId =
    propertyFilterMode === "all" ? "" : selectedPropertyId;

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      ...(activePropertyId && { propertyId: activePropertyId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.bookingRef && { bookingRef: filters.bookingRef }),
      ...(filters.guest && { guest: filters.guest }),
      ...(filters.from && { from: filters.from }),
      ...(filters.to && { to: filters.to }),
    }),
    [activePropertyId, filters, page],
  );
  const documentsQuery = useBillingDocuments(params);
  const error = documentsQuery.error
    ? normalizeApiError(documentsQuery.error).message
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Billing Documents
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Invoices, receipts, and future credit notes generated from frozen
          booking snapshots.
        </p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={activePropertyId}
            onChange={(event) => {
              const propertyId = event.target.value;
              setPropertyFilterMode(propertyId === "" ? "all" : "current");
              setSelectedPropertyId(propertyId || null);
            }}
          >
            <option value="">All properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value as "" | BillingDocumentType,
              }))
            }
          >
            {documentTypes.map((type) => (
              <option key={type || "ALL"} value={type}>
                {type ? formatEnumLabel(type) : "All types"}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as "" | BillingDocumentStatus,
              }))
            }
          >
            {documentStatuses.map((status) => (
              <option key={status || "ALL"} value={status}>
                {status ? formatEnumLabel(status) : "All statuses"}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Booking ref"
            value={filters.bookingRef}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                bookingRef: event.target.value,
              }))
            }
          />
          <input
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            placeholder="Guest"
            value={filters.guest}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                guest: event.target.value,
              }))
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
            <input
              type="date"
              className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documentsQuery.isPending ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  Loading billing documents...
                </td>
              </tr>
            ) : (documentsQuery.data?.items ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  No billing documents found.
                </td>
              </tr>
            ) : (
              (documentsQuery.data?.items ?? []).map((document) => {
                const booking = asRecord(document.bookingSnapshot);
                const guest = asRecord(document.guestSnapshot);
                return (
                  <tr key={document.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {document.documentNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatEnumLabel(document.type)} /{" "}
                        {formatEnumLabel(document.status)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {String(booking.bookingRef ?? "-")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {String(guest.name ?? "-")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(document.issuedAt)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatMoney(document.total)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(document.balance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={billingActions.isMutating}
                          onClick={() => {
                            void billingActions.downloadDocument(document);
                          }}
                        >
                          Download
                        </Button>
                        {canVoid && document.status !== "VOID" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            outline
                            disabled={billingActions.isMutating}
                            onClick={() => {
                              void billingActions.voidDocument({
                                documentId: document.id,
                                reason: "Voided from dashboard",
                              });
                            }}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
