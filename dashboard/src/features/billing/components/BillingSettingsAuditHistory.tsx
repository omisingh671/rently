import type { BillingSettingAudit } from "@/features/billing/types";
import {
  BILLING_SETTING_FIELD_LABELS,
  getChangedBillingSettingFields,
  toBillingSettingsFormState,
} from "./billingSettingsFields";

const formatAuditValue = (value: string | null) =>
  value && value.trim().length > 0 ? value : "Empty";

export default function BillingSettingsAuditHistory({
  audits,
  isLoading,
  error,
}: {
  audits: BillingSettingAudit[];
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <div className="border-t border-slate-200">
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Change history</h3>
        <p className="mt-1 text-sm text-slate-500">
          Latest billing-setting changes and their recorded reasons.
        </p>
      </div>

      {error ? (
        <div className="px-6 pb-5 text-sm text-rose-700">{error}</div>
      ) : isLoading ? (
        <div className="px-6 pb-5 text-sm text-slate-500">
          Loading change history...
        </div>
      ) : audits.length === 0 ? (
        <div className="px-6 pb-5 text-sm text-slate-500">
          No billing-setting changes recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {audits.map((audit) => {
            const changedFields = getChangedBillingSettingFields(
              toBillingSettingsFormState(audit.previousData),
              toBillingSettingsFormState(audit.nextData),
            );

            return (
              <div key={audit.id} className="space-y-2 px-6 py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {audit.actor.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {audit.actor.email}
                    </p>
                  </div>
                  <time className="text-xs font-medium text-slate-500">
                    {new Date(audit.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="text-sm text-slate-700">{audit.reason}</p>
                <p className="text-xs text-slate-500">
                  Changed:{" "}
                  {changedFields
                    .map((field) => BILLING_SETTING_FIELD_LABELS[field])
                    .join(", ")}
                </p>
                <div className="space-y-2 rounded-md bg-slate-50 p-3">
                  {changedFields.map((field) => (
                    <div key={field} className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">
                        {BILLING_SETTING_FIELD_LABELS[field]}:
                      </span>{" "}
                      <span className="break-words">
                        {formatAuditValue(audit.previousData[field])} {" -> "}
                        {formatAuditValue(audit.nextData[field])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
