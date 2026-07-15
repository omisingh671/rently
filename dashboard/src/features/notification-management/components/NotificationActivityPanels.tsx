import type { NotificationAudit, NotificationDelivery } from "../types";

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export function NotificationActivityPanels({
  audits,
  deliveries,
  retryingId,
  onRetry,
}: {
  audits: NotificationAudit[];
  deliveries: NotificationDelivery[];
  retryingId?: string;
  onRetry: (id: string) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Recent setting changes</h2>
          <p className="mt-1 text-sm text-slate-500">Latest 100 audited changes.</p>
        </div>
        <div className="max-h-96 overflow-auto">
          {audits.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No setting changes yet.</p>
          ) : audits.map((audit) => (
            <div key={audit.id} className="border-b border-slate-100 px-5 py-3 text-sm last:border-0">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-slate-800">{audit.eventKey.replaceAll("_", " ")}</span>
                <span className="text-xs text-slate-500">{formatDateTime(audit.createdAt)}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {audit.previousState ?? "UNSET"} → {audit.nextState} · {audit.channel}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {audit.actor.fullName}{audit.property ? ` · ${audit.property.name}` : " · Global"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Business notification deliveries</h2>
          <p className="mt-1 text-sm text-slate-500">Password-reset delivery remains separate.</p>
        </div>
        <div className="max-h-96 overflow-auto">
          {deliveries.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No business notifications queued yet.</p>
          ) : deliveries.map((delivery) => (
            <div key={delivery.id} className="border-b border-slate-100 px-5 py-3 text-sm last:border-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{delivery.eventKey.replaceAll("_", " ")}</p>
                  <p className="truncate text-slate-500">{delivery.recipient}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  delivery.status === "SUCCEEDED"
                    ? "bg-emerald-50 text-emerald-700"
                    : delivery.status === "FAILED"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                }`}>{delivery.status}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>Attempts {delivery.attemptCount}/{delivery.maxAttempts} · {formatDateTime(delivery.createdAt)}</span>
                {delivery.status === "FAILED" && (
                  <button
                    type="button"
                    onClick={() => onRetry(delivery.id)}
                    disabled={retryingId === delivery.id}
                    className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {retryingId === delivery.id ? "Retrying…" : "Retry"}
                  </button>
                )}
              </div>
              {delivery.lastError && <p className="mt-2 text-xs text-rose-600">{delivery.lastError}</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
