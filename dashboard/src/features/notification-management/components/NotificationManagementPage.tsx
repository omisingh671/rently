import { useState } from "react";
import { useCurrentProperty } from "@/features/properties/hooks/useCurrentProperty";
import { useNotificationManagement } from "../hooks";
import type { NotificationEventKey, NotificationOverrideState } from "../types";
import { NotificationActivityPanels } from "./NotificationActivityPanels";
import { NotificationSettingsMatrix } from "./NotificationSettingsMatrix";

export default function NotificationManagementPage() {
  const [mode, setMode] = useState<"global" | "property">("global");
  const {
    selectedProperty,
    selectedPropertyId: propertyId,
  } = useCurrentProperty();
  const management = useNotificationManagement(mode === "property" && propertyId ? propertyId : undefined);
  const saving = management.globalMutation.isPending || management.overrideMutation.isPending;
  const hasError = management.settings.isError || management.audits.isError || management.deliveries.isError;

  const updateGlobal = (eventKey: NotificationEventKey, enabled: boolean) => {
    management.globalMutation.mutate({ eventKey, channel: "EMAIL", enabled });
  };
  const updateOverride = (eventKey: NotificationEventKey, state: NotificationOverrideState) => {
    if (!propertyId) return;
    management.overrideMutation.mutate({ propertyId, eventKey, channel: "EMAIL", state });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure guest-facing business notifications. Security emails are managed separately.
        </p>
      </header>

      {hasError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Some notification management data could not be loaded. Retry or refresh the page.
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {management.settings.data?.channels.map((channel) => (
          <div key={channel.key} className={`rounded-xl border p-4 ${channel.available ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">{channel.label}</h2>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${channel.available ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                {channel.available ? "Available" : "Coming soon"}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {channel.available ? "Provider connected and configurable." : "Provider is not implemented and cannot be enabled."}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex rounded-lg bg-slate-100 p-1">
            {(["global", "property"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md px-4 py-2 text-sm font-semibold capitalize ${mode === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
              >
                {value === "global" ? "Global Defaults" : "Property Overrides"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {management.settings.isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading notification settings…</div>
      ) : mode === "property" && !propertyId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Select a property to manage overrides.</div>
      ) : management.settings.data ? (
        <NotificationSettingsMatrix
          data={management.settings.data}
          mode={mode}
          propertyName={selectedProperty?.name}
          disabled={saving}
          onGlobalChange={updateGlobal}
          onOverrideChange={updateOverride}
        />
      ) : null}

      <NotificationActivityPanels
        audits={management.audits.data ?? []}
        deliveries={management.deliveries.data ?? []}
        retryingId={management.retryMutation.isPending ? management.retryMutation.variables : undefined}
        onRetry={(id) => management.retryMutation.mutate(id)}
      />
    </div>
  );
}
