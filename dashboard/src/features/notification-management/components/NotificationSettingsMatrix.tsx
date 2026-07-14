import type {
  NotificationEventKey,
  NotificationOverrideState,
  NotificationSettingsResponse,
} from "../types";

export function NotificationSettingsMatrix({
  data,
  mode,
  disabled,
  onGlobalChange,
  onOverrideChange,
}: {
  data: NotificationSettingsResponse;
  mode: "global" | "property";
  disabled: boolean;
  onGlobalChange: (eventKey: NotificationEventKey, enabled: boolean) => void;
  onOverrideChange: (eventKey: NotificationEventKey, state: NotificationOverrideState) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold text-slate-900">
          {mode === "global" ? "Global email defaults" : "Property email overrides"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "global"
            ? "Safe defaults are disabled until explicitly enabled."
            : "Use Global inherits the current global email setting."}
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {data.events.map((event) => {
          const setting = event.settings.find((item) => item.channel === "EMAIL");
          if (!setting) return null;
          return (
            <div key={event.key} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-medium text-slate-900">{event.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Effective: <span className={setting.effectiveEnabled ? "text-emerald-700" : "text-slate-600"}>
                    {setting.effectiveEnabled ? "Enabled" : "Disabled"}
                  </span>
                  {mode === "property" && ` · Global is ${setting.globalEnabled ? "Enabled" : "Disabled"}`}
                </p>
              </div>
              {mode === "global" ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onGlobalChange(event.key, !setting.globalEnabled)}
                  className={`min-w-24 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                    setting.globalEnabled
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {setting.globalEnabled ? "Enabled" : "Disabled"}
                </button>
              ) : event.propertyScoped ? (
                <select
                  value={setting.overrideState ?? "USE_GLOBAL"}
                  disabled={disabled}
                  onChange={(e) => onOverrideChange(event.key, e.target.value as NotificationOverrideState)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="USE_GLOBAL">Use Global</option>
                  <option value="ENABLED">Enabled</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              ) : (
                <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500">Global only</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
